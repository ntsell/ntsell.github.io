import { supabase } from './supabaseClient';

/**
 * Mã hóa AES-GCM 256-bit qua Edge Function bảo mật server-side
 * Không để lộ khóa mã hóa trong client bundle. Không dùng Base64 fallback.
 */
export async function encryptSensitiveData(plainText: string): Promise<string> {
  if (!plainText) return '';
  const { data, error } = await supabase.functions.invoke('crypto-vault', {
    body: { action: 'encrypt', text: plainText }
  });
  if (error || !data?.ciphertext) {
    throw new Error(`Không thể mã hóa dữ liệu: ${error?.message || 'Lỗi crypto-vault'}`);
  }
  return data.ciphertext;
}

/**
 * Giải mã chuỗi đã mã hóa qua Edge Function server-side
 * Yêu cầu quyền sở hữu hoặc quyền Quản Trị Viên (RBAC).
 */
export async function decryptSensitiveData(encryptedText: string, ownerId?: string): Promise<string> {
  if (!encryptedText) return '';
  const { data, error } = await supabase.functions.invoke('crypto-vault', {
    body: { action: 'decrypt', text: encryptedText, ownerId }
  });
  if (error || typeof data?.plaintext !== 'string') {
    throw new Error(`Không thể giải mã dữ liệu: ${error?.message || 'Lỗi crypto-vault'}`);
  }
  return data.plaintext;
}

/**
 * Tạo Username tự động từ tên thật học sinh
 * Định dạng: nguyen_van_a (không dấu, chữ thường, gạch dưới)
 */
export function generateUsernameFromRealName(fullName: string): string {
  if (!fullName) return 'user_' + Math.floor(Math.random() * 10000);
  
  const clean = fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
    
  return clean || 'hocsinh_' + Math.floor(Math.random() * 10000);
}
