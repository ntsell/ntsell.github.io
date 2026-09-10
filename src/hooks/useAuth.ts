// ====================================================================
// USE AUTH HOOK (SUPABASE AUTH + SERVER-VERIFIED SESSION MANAGEMENT)
// Quyền Admin được kiểm tra trực tiếp từ JWT app_metadata & Database RLS
// Tuyệt đối không cho phép leo thang đặc quyền qua LocalStorage
// ====================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile, UserSession } from '../types';
import { 
  registerDeviceSession, 
  terminateCurrentSession, 
  getLocalCurrentSession 
} from '../services/sessionService';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('ntsell_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentSession, setCurrentSession] = useState<UserSession | null>(getLocalCurrentSession);

  // Xác thực danh tính & đồng bộ quyền hạn thực sự từ Supabase JWT
  useEffect(() => {
    const syncUserWithBackend = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Nếu không có session Supabase hợp lệ, tài khoản không thể giữ quyền admin
        if (currentUser?.role === 'admin') {
          setCurrentUser(null);
          localStorage.removeItem('ntsell_current_user');
        }
        return;
      }

      let verifiedRole: 'admin' | 'student' = session.user.app_metadata?.role === 'admin' ? 'admin' : 'student';

      if (verifiedRole !== 'admin') {
        const { data: adminRoleRow } = await supabase
          .from('admin_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (adminRoleRow?.role === 'admin' || adminRoleRow?.role === 'superadmin') {
          verifiedRole = 'admin';
        }
      }

      // Tải profile mới nhất từ cơ sở dữ liệu
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (dbProfile) {
        const finalRole = verifiedRole;
        const updated: UserProfile = {
          id: dbProfile.id,
          encryptedRealName: dbProfile.encrypted_real_name || '',
          encryptedClassName: dbProfile.encrypted_class_name || '',
          encryptedUsername: dbProfile.display_name || '',
          displayName: dbProfile.display_name || 'Học sinh',
          email: session.user.email || dbProfile.email,
          role: finalRole,
          trustScore: dbProfile.trust_score ?? 100,
          completedOrdersCount: 0,
          violationCount: 0,
          status: 'active',
          createdAt: dbProfile.created_at || new Date().toISOString()
        };
        setCurrentUser(updated);
        localStorage.setItem('ntsell_current_user', JSON.stringify(updated));
      }
    };

    syncUserWithBackend();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setCurrentUser(null);
        setCurrentSession(null);
        localStorage.removeItem('ntsell_current_user');
      } else {
        syncUserWithBackend();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Cập nhật session khi user đổi
  useEffect(() => {
    if (currentUser?.id) {
      registerDeviceSession(currentUser.id).then(res => {
        setCurrentSession(res.session);
      });
    } else {
      setCurrentSession(null);
    }
  }, [currentUser?.id]);

  /**
   * Đăng xuất người dùng & giải phóng session (mặc định thu hồi toàn bộ session token qua global scope)
   */
  const logout = useCallback(async (options: { scope?: 'global' | 'local' | 'others' } = { scope: 'global' }) => {
    if (currentUser?.id) {
      await terminateCurrentSession(currentUser.id);
    }
    await supabase.auth.signOut({ scope: options.scope || 'global' });
    localStorage.removeItem('ntsell_current_user');
    setCurrentUser(null);
    setCurrentSession(null);
  }, [currentUser?.id]);

  return {
    currentUser,
    setCurrentUser,
    currentSession,
    logout,
    getDeviceFingerprint,
    registerDeviceSession
  };
}
