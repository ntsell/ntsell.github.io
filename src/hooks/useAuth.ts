// ====================================================================
// USE AUTH HOOK (SUPABASE AUTH + SESSION MANAGEMENT)
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
   * Đăng xuất người dùng & giải phóng session
   */
  const logout = useCallback(async () => {
    if (currentUser?.id) {
      await terminateCurrentSession(currentUser.id);
    }
    await supabase.auth.signOut();
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
