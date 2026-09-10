// ====================================================================
// KIỂM DUYỆT NỘI DUNG & DISPLAY NAME (BACKEND EDGE FUNCTION + FALLBACK)
// Bảo vệ môi trường học đường, chống 18+, lừa đảo, ngôn từ thô tục
// Chạy an toàn qua Supabase Edge Function (Key được bảo vệ ở server)
// ====================================================================

import { supabase } from './supabaseClient';

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
export async function moderateDisplayName(displayName: string): Promise<ModerationResult> {
  const trimmed = displayName.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, reason: 'Tên hiển thị phải có ít nhất 3 ký tự.' };
  }
  if (trimmed.length > 25) {
    return { isValid: false, reason: 'Tên hiển thị không được vượt quá 25 ký tự.' };
  }

  // Guardrail cục bộ tức thời
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

  // Gọi Supabase Edge Function (Key được lưu trữ an toàn phía backend)
  try {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: { action: 'display_name', displayName: trimmed }
    });

    if (!error && data) {
      return data as ModerationResult;
    }
  } catch (err) {
    console.warn('Backend Moderation Edge Function fallback to local rules:', err);
  }

  return { isValid: true };
}

// 2. KIỂM DUYỆT BÀI ĐĂNG BÁN MÁY TÍNH (NỘI DUNG, MÔ TẢ & GIÁ)
export async function moderatePostContent(
  title: string,
  description: string,
  price: number,
  model: string
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

  // Gọi Supabase Edge Function thẩm định chuyên sâu
  try {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        action: 'post',
        title,
        description,
        price,
        model
      }
    });

    if (!error && data) {
      return data as PostModerationResult;
    }
  } catch (err) {
    console.warn('Backend Post Moderation Edge Function fallback:', err);
  }

  // Fallback nếu offline / lỗi mạng
  return {
    isValid: true,
    flag: 'safe',
    reason: 'Đã vượt qua bộ lọc an toàn trường học.'
  };
}
