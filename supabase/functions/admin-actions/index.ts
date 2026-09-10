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

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: Missing service role key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Client với auth header của caller để xác thực danh tính
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Vui lòng đăng nhập" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Client service role để kiểm tra quyền và thực hiện thao tác bảo mật
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. KIỂM TRA QUYỀN ADMIN (từ app_metadata hoặc admin_roles/profiles)
    const isAdmin = user.app_metadata?.role === "admin" || (await (async () => {
      const { data: adminRole } = await adminClient.from("admin_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (adminRole?.role === "admin" || adminRole?.role === "superadmin") return true;
      const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
      return profile?.role === "admin";
    })());

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: Bạn không có quyền Quản Trị Viên" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. BẮT BUỘC XÁC THỰC 2 BƯỚC (MFA / TOTP) CẤP ĐỘ AAL2
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

    // Kiểm tra xem admin đã kích hoạt factor TOTP chưa
    const { data: mfaFactors } = await adminClient.auth.admin.mfa.listFactors({ userId: user.id });
    const hasVerifiedFactor = mfaFactors?.factors?.some((f: any) => f.status === 'verified');

    if (!hasVerifiedFactor) {
      return new Response(JSON.stringify({
        error: "MFA_NOT_ENROLLED",
        message: "Quản trị viên bắt buộc phải thiết lập xác thực 2 bước (2FA/TOTP) trước khi thực hiện thao tác."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!isAal2) {
      return new Response(JSON.stringify({
        error: "MFA_REQUIRED",
        message: "Phiên làm việc yêu cầu xác thực 2 bước (MFA/TOTP) cấp độ AAL2 để tiếp tục."
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { action, payload } = await req.json();

    const logAudit = async (actionName: string, targetType: string, targetId: string, details: any) => {
      await adminClient.from("audit_logs").insert([{
        actor_id: user.id,
        actor_email: user.email,
        action: actionName,
        target_type: targetType,
        target_id: targetId,
        details
      }]);
    };

    // 1. DUYỆT SẢN PHẨM
    if (action === "approve_product") {
      const { id } = payload;
      const { error } = await adminClient.from("products").update({ status: "active" }).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit("APPROVE_PRODUCT", "product", id, { status: "active" });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. YÊU CẦU SỬA BÀI
    if (action === "request_edit_product") {
      const { id, reason } = payload;
      const { error } = await adminClient.from("products").update({
        status: "requires_edit",
        admin_notes: reason
      }).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit("REQUEST_EDIT_PRODUCT", "product", id, { reason });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. TỪ CHỐI BÀI ĐĂNG
    if (action === "reject_product") {
      const { id, reason } = payload;
      const { error } = await adminClient.from("products").update({
        status: "rejected",
        admin_notes: reason
      }).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit("REJECT_PRODUCT", "product", id, { reason });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. GỠ SẢN PHẨM
    if (action === "takedown_product") {
      const { id, reason } = payload;
      const { error } = await adminClient.from("products").update({
        status: "flagged",
        admin_notes: reason
      }).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit("TAKEDOWN_PRODUCT", "product", id, { reason });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. XÓA SẢN PHẨM
    if (action === "delete_product") {
      const { id } = payload;
      const { error } = await adminClient.from("products").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit("DELETE_PRODUCT", "product", id, {});
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 6. XÓA TÀI KHOẢN
    if (action === "delete_user") {
      const { userId } = payload;
      const { error } = await adminClient.from("profiles").delete().eq("id", userId);
      if (error) throw new Error(error.message);
      await logAudit("DELETE_USER", "user", userId, {});
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 7. PHÁT THÔNG BÁO TOÀN SÀN
    if (action === "publish_broadcast") {
      const { announcement } = payload;
      await adminClient.from("broadcast_announcements").update({ is_active: false }).eq("is_active", true);
      const { error } = await adminClient.from("broadcast_announcements").insert([{
        id: announcement.id,
        message: announcement.message,
        duration_seconds: announcement.durationSeconds,
        is_active: true
      }]);
      if (error) throw new Error(error.message);
      await logAudit("PUBLISH_BROADCAST", "broadcast", announcement.id, { message: announcement.message });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 8. GIẢI QUYẾT TRANH CHẤP
    if (action === "resolve_dispute") {
      const { disputeId, resolution, notes } = payload;
      const { error } = await adminClient.from("disputes").update({
        status: resolution,
        admin_ruling_notes: notes,
        resolved_by: user.id,
        resolved_at: new Date().toISOString()
      }).eq("id", disputeId);
      if (error) throw new Error(error.message);
      await logAudit("RESOLVE_DISPUTE", "dispute", disputeId, { resolution, notes });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
