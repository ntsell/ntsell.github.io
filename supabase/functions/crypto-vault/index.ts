import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@^2.115.0";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigins = [
    "https://ntsell.github.io",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173"
  ];
  const allowOrigin = allowedOrigins.includes(origin) || origin.endsWith(".github.io")
    ? origin
    : "https://ntsell.github.io";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

let cachedKey: CryptoKey | null = null;

async function getDerivedKey(salt: string): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(salt),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  cachedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("ntsell_server_hkdf_salt_2026"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedKey;
}

function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function serverEncrypt(plainText: string, salt: string): Promise<string> {
  if (!plainText) return "";
  const key = await getDerivedKey(salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encodedData = enc.encode(plainText);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedData
  );

  const ivB64 = bufferToBase64(iv);
  const cipherB64 = bufferToBase64(cipherBuffer);
  return `ENC_V2_${ivB64}_${cipherB64}`;
}

async function serverDecrypt(encryptedText: string, salt: string): Promise<string> {
  if (!encryptedText) return "";
  if (!encryptedText.startsWith("ENC_V2_")) {
    return "[Dữ liệu không hợp lệ]";
  }

  const parts = encryptedText.split("_");
  if (parts.length < 4) return "[Dữ liệu hỏng]";

  const ivB64 = parts[2];
  const cipherB64 = parts.slice(3).join("_");

  const iv = base64ToBuffer(ivB64);
  const cipherBytes = base64ToBuffer(cipherB64);
  const key = await getDerivedKey(salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBytes
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serverSalt = Deno.env.get("PII_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Bắt buộc cấu hình secret môi trường - không fallback hardcode
    if (!serverSalt) {
      return new Response(JSON.stringify({ error: "Server configuration error: missing encryption secret" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // Xác thực danh tính phiên người dùng
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Phiên đăng nhập không hợp lệ" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    // 1. KIỂM TRA AAL2 (MFA LEVEL)
    let isAal2 = false;
    try {
      const tokenParts = authHeader.replace(/^Bearer\s+/i, '').split('.');
      if (tokenParts.length >= 2) {
        const b64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(atob(b64));
        if (json.aal === 'aal2') isAal2 = true;
      }
    } catch {}

    if (!isAal2) {
      try {
        const { data: aalData } = await userClient.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel === 'aal2') isAal2 = true;
      } catch {}
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: missing SUPABASE_SERVICE_ROLE_KEY" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" }
      });
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 2. KIỂM TRA QUYỀN ADMIN (app_metadata hoặc bảng admin_roles)
    let isAdmin = user.app_metadata?.role === "admin";
    if (!isAdmin) {
      const { data: adminRole } = await adminClient
        .from("admin_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (adminRole?.role === "admin" || adminRole?.role === "superadmin") {
        isAdmin = true;
      }
    }

    const { action, text, texts, ownerId } = await req.json();

    // 3. MÃ HÓA
    if (action === "encrypt") {
      const ciphertext = await serverEncrypt(String(text || ""), serverSalt);
      return new Response(JSON.stringify({ ciphertext }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (action === "batch_encrypt" && Array.isArray(texts)) {
      const ciphertexts = await Promise.all(
        texts.map((t: string) => serverEncrypt(String(t || ""), serverSalt))
      );
      return new Response(JSON.stringify({ ciphertexts }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 4. GIẢI MÃ: BẮT BUỘC AAL2 CHO ADMIN & XÁC MINH SỞ HỮU CHO USER (FAIL-CLOSED)
    if (action === "decrypt") {
      const targetOwnerId = ownerId || user.id;
      const isOwner = targetOwnerId === user.id;

      // Admin bắt buộc phải có MFA cấp độ AAL2 mới được giải mã
      if (isAdmin) {
        if (!isAal2) {
          return new Response(JSON.stringify({ 
            error: "MFA_REQUIRED",
            message: "Quản trị viên bắt buộc phải hoàn tất xác thực 2 bước (MFA level AAL2) trước khi giải mã dữ liệu."
          }), {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      } else {
        // User thông thường: Chỉ được giải mã dữ liệu của chính mình
        if (!isOwner) {
          return new Response(JSON.stringify({ 
            error: "Forbidden: Bạn chỉ được phép giải mã dữ liệu cá nhân của chính mình" 
          }), {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }

        const ciphertext = String(text || "");
        if (!ciphertext) {
          return new Response(JSON.stringify({ error: "Dữ liệu mã hóa không được để trống" }), {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" }
          });
        }

        // Kiểm tra quyền sở hữu ciphertext trong Database (Bắt buộc fail-closed)
        const [{ data: privData, error: privErr }, { data: profData, error: profErr }, { data: prodData, error: prodErr }] = await Promise.all([
          adminClient
            .from("user_private_data")
            .select("encrypted_real_name, encrypted_class_name, encrypted_phone")
            .eq("user_id", user.id)
            .maybeSingle(),
          adminClient
            .from("profiles")
            .select("encrypted_real_name, encrypted_class_name, encrypted_phone")
            .eq("id", user.id)
            .maybeSingle(),
          adminClient
            .from("products")
            .select("id")
            .eq("seller_id", user.id)
            .eq("encrypted_serial_number", ciphertext)
            .limit(1)
        ]);

        if (privErr || profErr || prodErr) {
          return new Response(JSON.stringify({ error: "Lỗi cơ sở dữ liệu khi xác minh quyền sở hữu dữ liệu" }), {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" }
          });
        }

        const matchesOwner = 
          (privData && (privData.encrypted_real_name === ciphertext || privData.encrypted_class_name === ciphertext || privData.encrypted_phone === ciphertext)) ||
          (profData && (profData.encrypted_real_name === ciphertext || profData.encrypted_class_name === ciphertext || profData.encrypted_phone === ciphertext)) ||
          (prodData && prodData.length > 0);

        if (!matchesOwner) {
          return new Response(JSON.stringify({ 
            error: "Forbidden: Chuỗi mã hóa không thuộc hồ sơ hoặc bài đăng nào của tài khoản này." 
          }), {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
      }

      const plaintext = await serverDecrypt(String(text || ""), serverSalt);
      return new Response(JSON.stringify({ plaintext }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
