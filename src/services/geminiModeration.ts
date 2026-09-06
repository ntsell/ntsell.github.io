// ====================================================================
// GEMINI 2.5 FLASH API - KIỂM DUYỆT DISPLAY NAME & NỘI DUNG
// Chặn 18+, ngôn từ thô tục, lăng mạ, bạo lực học đường
// ====================================================================

import { GoogleGenAI } from '@google/genai';

// Danh sách từ khóa cấm cục bộ (offline / fallback guardrail)
const LOCAL_BANNED_WORDS = [
  'sex', 'fuck', 'dm', 'dcm', 'vcl', 'clgt', 'lon', 'cac', 'buoi',
  'chet di', 'ngu', 'cho', 'suc sinh', 'dam tac', 'lua dao', 'scammer',
  '18+', 'dam', 'dit', 'cu', 'bitch', 'asshole', 'kill', 'suicide'
];

export interface ModerationResult {
  isValid: boolean;
  reason?: string;
  suggestedName?: string;
}

export async function moderateDisplayName(
  displayName: string, 
  apiKey?: string
): Promise<ModerationResult> {
  const trimmed = displayName.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, reason: 'Tên hiển thị phải có ít nhất 3 ký tự.' };
  }
  if (trimmed.length > 25) {
    return { isValid: false, reason: 'Tên hiển thị không được vượt quá 25 ký tự.' };
  }

  // 1. Kiểm tra Guardrail cục bộ trước
  const lower = trimmed.toLowerCase();
  for (const banned of LOCAL_BANNED_WORDS) {
    if (lower.includes(banned)) {
      return {
        isValid: false,
        reason: 'Tên chứa từ ngữ không phù hợp môi trường học đường hoặc nhạy cảm.',
        suggestedName: `HocSinhCasio_${Math.floor(100 + Math.random() * 900)}`
      };
    }
  }

  // 2. Nếu có GEMINI API KEY -> Gọi Gemini 2.5 Flash để thẩm định ngữ nghĩa sâu
  const activeKey = apiKey || (import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY : '');
  
  if (activeKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: activeKey });
      const prompt = `Bạn là hệ thống kiểm duyệt tên người dùng cho sàn giao dịch máy tính học sinh phổ thông tại Việt Nam.
Hãy kiểm tra xem tên hiển thị sau có phù hợp với học sinh không: "${trimmed}".
Tiêu chí cấm:
- Nội dung khiêu dâm, 18+, thô tục
- Lăng mạ, bắt nạt, xúc phạm người khác
- Giả mạo cơ quan nhà trường hoặc quảng cáo lừa đảo

Trả về định dạng JSON chính xác:
{
  "isValid": true/false,
  "reason": "lý do ngắn gọn nếu vi phạm, nếu hợp lệ để trống",
  "suggestedName": "gợi ý tên học sinh lịch sự nếu vi phạm"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text?.trim() || '';
      if (responseText) {
        const parsed = JSON.parse(responseText) as ModerationResult;
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini Moderation API fallback to local rules:', err);
    }
  }

  // Mặc định hợp lệ nếu vượt qua bộ lọc an toàn
  return { isValid: true };
}
