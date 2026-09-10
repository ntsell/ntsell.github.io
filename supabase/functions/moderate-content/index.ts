import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI } from "npm:@google/genai@^2.21.0";

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

const LOCAL_BANNED_WORDS = [
  'sex', 'fuck', 'dm', 'dcm', 'vcl', 'clgt', 'lon', 'cac', 'buoi',
  'chet di', 'ngu', 'cho', 'suc sinh', 'dam tac', 'lua dao', 'scammer',
  '18+', 'dam', 'dit', 'cu', 'bitch', 'asshole', 'kill', 'suicide'
];

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, displayName, title, description, price, model } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY") || "";

    if (action === "display_name") {
      const trimmed = (displayName || "").trim();
      if (trimmed.length < 3) {
        return new Response(
          JSON.stringify({ isValid: false, reason: "Tên hiển thị phải có ít nhất 3 ký tự." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (trimmed.length > 25) {
        return new Response(
          JSON.stringify({ isValid: false, reason: "Tên hiển thị không được vượt quá 25 ký tự." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lower = trimmed.toLowerCase();
      for (const banned of LOCAL_BANNED_WORDS) {
        if (lower.includes(banned)) {
          return new Response(
            JSON.stringify({
              isValid: false,
              reason: "Tên chứa từ ngữ không phù hợp môi trường học đường hoặc nhạy cảm.",
              suggestedName: `HocSinhCasio_${Math.floor(100 + Math.random() * 900)}`
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Bạn là hệ thống kiểm duyệt tên người dùng cho sàn giao dịch máy tính học sinh phổ thông tại Việt Nam (NTSell).
Hãy kiểm tra xem tên hiển thị sau có phù hợp với học sinh không: "${trimmed}".
Tiêu chí cấm:
- Nội dung khiêu dâm, 18+, thô tục, tiếng lóng bậy
- Lăng mạ, bắt nạt, xúc phạm người khác
- Giả mạo cơ quan nhà trường, giáo viên hoặc quảng cáo lừa đảo

Trả về định dạng JSON chính xác duy nhất:
{
  "isValid": true/false,
  "reason": "lý do ngắn gọn nếu vi phạm, nếu hợp lệ để trống",
  "suggestedName": "gợi ý tên học sinh lịch sự nếu vi phạm"
}`;
          const response = await ai.models.generateContent({
            model: "gemini-flash-lite-latest",
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          const parsed = JSON.parse(response.text?.trim() || "{}");
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (e) {
          console.warn("Gemini Edge fallback:", e);
        }
      }
      return new Response(JSON.stringify({ isValid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "post") {
      const fullText = `${title || ""} ${description || ""}`.toLowerCase();
      for (const banned of LOCAL_BANNED_WORDS) {
        if (fullText.includes(banned)) {
          return new Response(
            JSON.stringify({
              isValid: false,
              flag: "violation",
              reason: "Bài đăng chứa từ ngữ vi phạm quy chuẩn văn hóa học đường.",
              suggestion: "Vui lòng chỉnh sửa và loại bỏ các từ ngữ nhạy cảm."
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Bạn là hệ thống kiểm duyệt tự động thông minh cho sàn trao đổi máy tính học sinh NTSell.
Nhiệm vụ của bạn là thẩm định tính an toàn và chất lượng bài đăng bán máy tính:
- Tiêu đề: "${title || ""}"
- Dòng máy: "${model || ""}"
- Mô tả: "${description || ""}"
- Giá đề xuất: ${price || 0} VNĐ

Tiêu chí kiểm duyệt:
1. AN TOÀN VĂN HÓA: Tuyệt đối không chứa ngôn từ thô tục, 18+, đe dọa, xúc phạm hoặc kích động bạo lực.
2. PHÒNG CHỐNG GIAN LẬN: Không dụ dỗ chuyển cọc/tiền trước, không để giá bất thường phi lý (ví dụ: máy Casio 580 mà để giá 1000đ hoặc 100 triệu đồng).
3. ĐÚNG MỤC ĐÍCH: Đúng là máy tính cầm tay phục vụ học tập (Casio FX-580, FX-570, FX-880, Flexio, Vinacal,...).

Hãy trả về định dạng JSON chính xác duy nhất:
{
  "isValid": true/false,
  "flag": "safe" | "warning" | "violation",
  "reason": "Giải thích ngắn gọn bằng tiếng Việt (tối đa 2 câu)",
  "suggestion": "Gợi ý bổ sung thông tin cho học sinh nếu cần, hoặc để trống"
}`;
          const response = await ai.models.generateContent({
            model: "gemini-flash-lite-latest",
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          const parsed = JSON.parse(response.text?.trim() || "{}");
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (e) {
          console.warn("Gemini Edge post fallback:", e);
        }
      }
      return new Response(
        JSON.stringify({ isValid: true, flag: "safe", reason: "Đã vượt qua bộ lọc an toàn trường học." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
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
