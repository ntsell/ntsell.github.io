// ====================================================================
// SESSION MANAGEMENT SERVICE (SINGLE-DEVICE MODE & REMOTE LOGOUT)
// Quản lý phiên đăng nhập đơn thiết bị & phát hiện thiết bị lạ
// ====================================================================

import { supabase } from './supabaseClient';
import { UserSession } from '../types';
import { getDeviceFingerprint, getDeviceName, getClientIP } from '../utils/deviceFingerprint';

const LOCAL_SESSION_KEY = 'ntsell_current_session';

/**
 * Lấy session hiện tại lưu ở client
 */
export function getLocalCurrentSession(): UserSession | null {
  try {
    const s = localStorage.getItem(LOCAL_SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

/**
 * Lưu session hiện tại ở client
 */
export function setLocalCurrentSession(session: UserSession | null): void {
  if (session) {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  }
}

/**
 * Lấy danh sách session của một user từ Supabase (có fallback offline/mock)
 */
export async function fetchUserSessions(userId: string): Promise<UserSession[]> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity', { ascending: false });

    if (error) {
      // Nếu bảng chưa có trong Supabase hoặc lỗi RLS, đọc từ local cache
      const cached = localStorage.getItem(`ntsell_sessions_${userId}`);
      return cached ? JSON.parse(cached) : [];
    }

    const sessions: UserSession[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      deviceFingerprint: row.device_fingerprint,
      deviceName: row.device_name || 'Thiết bị',
      ipAddress: row.ip_address || '',
      lastActivity: row.last_activity,
      createdAt: row.created_at,
      isActive: Boolean(row.is_active)
    }));

    localStorage.setItem(`ntsell_sessions_${userId}`, JSON.stringify(sessions));
    return sessions;
  } catch {
    const cached = localStorage.getItem(`ntsell_sessions_${userId}`);
    return cached ? JSON.parse(cached) : [];
  }
}

/**
 * Đăng ký hoặc kích hoạt session mới (Single-device mode: vô hiệu hóa session cũ nếu thiết bị khác)
 */
export async function registerDeviceSession(
  userId: string, 
  forceOverride: boolean = false
): Promise<{
  session: UserSession;
  needsDeviceWarning: boolean;
  previousDeviceName?: string;
}> {
  const currentFp = await getDeviceFingerprint();
  const currentDeviceName = getDeviceName();
  const currentIP = await getClientIP();

  // 1. Kiểm tra các session active của user này
  const existingSessions = await fetchUserSessions(userId);
  const activeSessions = existingSessions.filter(s => s.isActive);

  const matchedSameDevice = activeSessions.find(s => s.deviceFingerprint === currentFp);
  const otherDeviceSession = activeSessions.find(s => s.deviceFingerprint !== currentFp);

  // Nếu đang có thiết bị khác đăng nhập và chưa có lệnh forceOverride
  if (otherDeviceSession && !matchedSameDevice && !forceOverride) {
    return {
      session: otherDeviceSession,
      needsDeviceWarning: true,
      previousDeviceName: otherDeviceSession.deviceName
    };
  }

  // 2. Vô hiệu hóa TẤT CẢ các thiết bị khác (Single-device mode)
  try {
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .neq('device_fingerprint', currentFp);
  } catch (err) {
    console.warn('Lỗi khi revoke session cũ trên Supabase:', err);
  }

  // 3. Upsert session của thiết bị hiện tại
  const sessionId = matchedSameDevice ? matchedSameDevice.id : ('sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
  const newSession: UserSession = {
    id: sessionId,
    userId,
    deviceFingerprint: currentFp,
    deviceName: currentDeviceName,
    ipAddress: currentIP,
    lastActivity: new Date().toISOString(),
    createdAt: matchedSameDevice ? matchedSameDevice.createdAt : new Date().toISOString(),
    isActive: true
  };

  try {
    await supabase
      .from('user_sessions')
      .upsert({
        id: newSession.id,
        user_id: userId,
        device_fingerprint: currentFp,
        device_name: currentDeviceName,
        ip_address: currentIP,
        last_activity: newSession.lastActivity,
        is_active: true
      });
  } catch (err) {
    console.warn('Lỗi upsert user_sessions:', err);
  }

  // Cập nhật local storage
  setLocalCurrentSession(newSession);

  // Cập nhật danh sách local cache
  const updatedList = [
    newSession,
    ...existingSessions.filter(s => s.deviceFingerprint !== currentFp).map(s => ({ ...s, isActive: false }))
  ];
  localStorage.setItem(`ntsell_sessions_${userId}`, JSON.stringify(updatedList));

  // Gửi broadcast sync tab
  if (typeof BroadcastChannel !== 'undefined') {
    const bc = new BroadcastChannel('ntsell_session_channel');
    bc.postMessage({ type: 'SESSION_STARTED', payload: newSession });
    bc.close();
  }

  return {
    session: newSession,
    needsDeviceWarning: false
  };
}

/**
 * Cập nhật last_activity của session hiện tại (Heartbeat)
 */
export async function heartbeatSession(sessionId: string, userId: string): Promise<boolean> {
  const currentFp = await getDeviceFingerprint();
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('device_fingerprint', currentFp)
      .eq('is_active', true)
      .select('is_active');

    if (error) return true; // Offline fallback
    if (data && data.length > 0 && !data[0].is_active) {
      return false; // Session đã bị revoke từ xa!
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Logout session thiết bị hiện tại
 */
export async function terminateCurrentSession(userId: string): Promise<void> {
  const currentFp = await getDeviceFingerprint();
  setLocalCurrentSession(null);

  try {
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('device_fingerprint', currentFp);
  } catch {}

  const cached = localStorage.getItem(`ntsell_sessions_${userId}`);
  if (cached) {
    try {
      const list: UserSession[] = JSON.parse(cached);
      const updated = list.map(s => s.deviceFingerprint === currentFp ? { ...s, isActive: false } : s);
      localStorage.setItem(`ntsell_sessions_${userId}`, JSON.stringify(updated));
    } catch {}
  }
}

/**
 * Admin: Lấy toàn bộ sessions trong hệ thống
 */
export async function fetchAllSessionsAdmin(): Promise<UserSession[]> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*, profiles:user_id(display_name)')
      .order('last_activity', { ascending: false });

    if (error) {
      // Fallback gom từ các cache cục bộ
      const all: UserSession[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ntsell_sessions_')) {
          try {
            const arr = JSON.parse(localStorage.getItem(k) || '[]');
            all.push(...arr);
          } catch {}
        }
      }
      return all;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      userDisplayName: row.profiles?.display_name || 'Học sinh',
      deviceFingerprint: row.device_fingerprint,
      deviceName: row.device_name || 'Thiết bị',
      ipAddress: row.ip_address || '',
      lastActivity: row.last_activity,
      createdAt: row.created_at,
      isActive: Boolean(row.is_active)
    }));
  } catch {
    return [];
  }
}

/**
 * Admin: Buộc logout một session từ xa
 */
export async function revokeSessionByAdmin(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}
