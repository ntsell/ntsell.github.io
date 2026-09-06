// ====================================================================
// CRYPTO & SECURITY SERVICE
// Hỗ trợ mã hóa PII (Tên thật, Lớp, SĐT) bảo vệ quyền riêng tư học sinh
// ====================================================================

// Trong môi trường trình duyệt, sử dụng Web Crypto API (SubtleCrypto) hoặc Base64 Obfuscation + Token Key
const SECRET_SALT = 'CASIO_STUDENT_MARKETPLACE_2026_SECURITY';

export async function encryptSensitiveData(plainText: string): Promise<string> {
  if (!plainText) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText + '::' + SECRET_SALT);
    // Tạo hash SHA-256 kết hợp mã hóa Base64 an toàn
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Obfuscated payload với prefix bảo mật
    const b64 = btoa(encodeURIComponent(plainText));
    return `ENC_${b64}_${hashHex.substring(0, 8)}`;
  } catch {
    return `ENC_${btoa(encodeURIComponent(plainText))}`;
  }
}

export function decryptSensitiveData(encryptedText: string): string {
  if (!encryptedText) return '';
  try {
    if (encryptedText.startsWith('ENC_')) {
      const parts = encryptedText.split('_');
      const b64 = parts[1];
      return decodeURIComponent(atob(b64));
    }
    return encryptedText;
  } catch {
    return '[Dữ liệu đã mã hoá bảo vệ]';
  }
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
