// ====================================================================
// DEVICE FINGERPRINT & DETECTION UTILITIES
// Sử dụng @fingerprintjs/fingerprintjs độ chính xác 99% + Fallback
// ====================================================================

import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Cache Fingerprint agent instance
let fpPromise: ReturnType<typeof FingerprintJS.load> | null = null;

/**
 * Lấy device fingerprint duy nhất của thiết bị hiện tại
 */
export async function getDeviceFingerprint(): Promise<string> {
  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load();
    }
    const fp = await fpPromise;
    const result = await fp.get();
    if (result && result.visitorId) {
      localStorage.setItem('ntsell_device_fingerprint', result.visitorId);
      return result.visitorId;
    }
  } catch (err) {
    console.warn('Lỗi lấy FingerprintJS, chuyển sang fallback:', err);
  }

  // Fallback nếu trình duyệt chặn FingerprintJS (nPrivacy, Safari ITP, AdBlock)
  let cachedFp = localStorage.getItem('ntsell_device_fingerprint');
  if (!cachedFp) {
    const rawData = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      Math.random().toString(36).substring(2, 10)
    ].join('###');
    
    // Hash đơn giản
    let hash = 0;
    for (let i = 0; i < rawData.length; i++) {
      hash = ((hash << 5) - hash) + rawData.charCodeAt(i);
      hash |= 0;
    }
    cachedFp = 'fp_fallback_' + Math.abs(hash).toString(16) + '_' + Date.now().toString(36);
    localStorage.setItem('ntsell_device_fingerprint', cachedFp);
  }
  return cachedFp;
}

/**
 * Lấy tên thiết bị dễ hiểu: "Chrome on Windows", "Safari on iOS", etc.
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = 'Trình duyệt';
  let os = 'Hệ điều hành';

  // Nhận diện Hệ điều hành
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Nhận diện Trình duyệt
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';

  const isMobile = /Mobi|Android/i.test(ua);
  const deviceType = isMobile ? 'Điện thoại' : 'Máy tính';

  return `${browser} trên ${os} (${deviceType})`;
}

/**
 * Lấy địa chỉ IP công khai của Client qua ipify API
 */
export async function getClientIP(): Promise<string> {
  try {
    const cachedIP = sessionStorage.getItem('ntsell_client_ip');
    if (cachedIP) return cachedIP;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const res = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        sessionStorage.setItem('ntsell_client_ip', data.ip);
        return data.ip;
      }
    }
  } catch (err) {
    // Không log lỗi nếu bị chặn CORS / offline
  }
  return '127.0.0.1';
}
