// ====================================================================
// GEMINI FLASH LITE API - KIỂM DUYỆT DISPLAY NAME & NỘI DUNG BÀI ĐĂNG
// Chặn 18+, ngôn từ thô tục, lăng mạ, bạo lực học đường, chống lừa đảo
// Model: gemini-flash-lite-latest (Tốc độ phản hồi tức thời, siêu tiết kiệm quota)
// ====================================================================

import { GoogleGenAI } from '@google/genai';

// API Key chỉ đọc từ biến môi trường VITE_GEMINI_API_KEY (hoặc do user truyền vào), tuyệt đối không để lộ trong source code
const getActiveGeminiKey = (customKey?: string): string => {
  if (customKey) return customKey;
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  return '';
};

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

export interface PostModerationResult {
  isValid: boolean;
  flag: 'safe' | 'warning' | 'violation';
  reason: string;
  suggestion?: string;
}

// 1. KIỂM DUYỆT TÊN HIỂN THỊ HỌC SINH (DISPLAY NAME)
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

  // Guardrail cục bộ trước
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

  // Gọi Gemini Flash Lite API để thẩm định ngữ nghĩa sâu
  const activeKey = getActiveGeminiKey(apiKey);
  
  if (activeKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: activeKey });
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
        model: 'gemini-flash-lite-latest',
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

  return { isValid: true };
}

// 2. KIỂM DUYỆT BÀI ĐĂNG BÁN MÁY TÍNH (NỘI DUNG, MÔ TẢ & GIÁ)
export async function moderatePostContent(
  title: string,
  description: string,
  price: number,
  model: string,
  apiKey?: string
): Promise<PostModerationResult> {
  // Guardrail cơ bản cục bộ
  const fullText = `${title} ${description}`.toLowerCase();
  for (const banned of LOCAL_BANNED_WORDS) {
    if (fullText.includes(banned)) {
      return {
        isValid: false,
        flag: 'violation',
        reason: 'Bài đăng chứa từ ngữ vi phạm quy chuẩn văn hóa học đường.',
        suggestion: 'Vui lòng chỉnh sửa và loại bỏ các từ ngữ nhạy cảm.'
      };
    }
  }

  // Gọi Gemini Flash Lite API thẩm định chuyên sâu
  const activeKey = getActiveGeminiKey(apiKey);

  if (activeKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: activeKey });
      const prompt = `Bạn là hệ thống kiểm duyệt tự động thông minh cho sàn trao đổi máy tính học sinh NTSell.
Nhiệm vụ của bạn là thẩm định tính an toàn và chất lượng bài đăng bán máy tính:
- Tiêu đề: "${title}"
- Dòng máy: "${model}"
- Mô tả: "${description}"
- Giá đề xuất: ${price.toLocaleString('vi-VN')} VNĐ

Tiêu chí kiểm duyệt:
1. AN TOÀN VĂN HÓA: Tuyệt đối không chứa ngôn từ thô tục, 18+, đe dọa, xúc phạm hoặc kích động bạo lực.
2. PHÒNG CHỐNG GIAN LẬN: Không dụ dỗ chuyển cọc/tiền trước, không để giá bất thường phi lý (ví dụ: máy Casio 580 mà để giá 1000đ hoặc 100 triệu đồng).
3. ĐÚNG MỤC ĐÍCH: Đúng là máy tính cầm tay phục vụ học tập (Casio FX-580, FX-570, FX-880, Flexio, Vinacal,...).

Hãy trả về định dạng JSON chính xác duy nhất:
{
  "isValid": true/false,
  "flag": "safe" | "warning" | "violation",
  "reason": "Giải thích ngắn gọn bằng tiếng Việt (tối đa 2 câu)",
  "suggestion": "Gợi ý bổ sung thông tin cho học sinh (ví dụ: bổ sung tình trạng pin, phím bấm) nếu cần, hoặc để trống"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text?.trim() || '';
      if (responseText) {
        const parsed = JSON.parse(responseText) as PostModerationResult;
        return parsed;
      }
    } catch (err) {
      console.warn('Gemini Post Moderation API fallback:', err);
    }
  }

  // Fallback nếu không có mạng / lỗi API
  return {
    isValid: true,
    flag: 'safe',
    reason: 'Đã vượt qua bộ lọc an toàn trường học.'
  };
}

