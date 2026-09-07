// ====================================================================
// USE SESSION MONITOR HOOK (HEARTBEAT & REALTIME DETECTION)
// Định kỳ heartbeat & kiểm tra nếu session bị revoke từ xa
// ====================================================================

import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { getLocalCurrentSession, heartbeatSession } from '../services/sessionService';

export function useSessionMonitor(
  currentUser: UserProfile | null, 
  onSessionRevoked: () => void
) {
  const onSessionRevokedRef = useRef(onSessionRevoked);
  onSessionRevokedRef.current = onSessionRevoked;

  useEffect(() => {
    if (!currentUser?.id) return;

    // 1. Định kỳ 2 phút heartbeat cập nhật last_activity
    const interval = setInterval(async () => {
      const session = getLocalCurrentSession();
      if (!session || !session.isActive) return;

      const stillValid = await heartbeatSession(session.id, currentUser.id);
      if (!stillValid) {
        console.warn('Phát hiện session hiện tại đã bị thu hồi từ xa!');
        onSessionRevokedRef.current();
      } else {
        console.log(`Session heartbeat OK lúc [${new Date().toLocaleTimeString('vi-VN')}]`);
      }
    }, 120000); // 2 phút

    // 2. Lắng nghe Realtime changes trên bảng user_sessions
    const channel = supabase.channel(`user_sessions_${currentUser.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_sessions', 
          filter: `user_id=eq.${currentUser.id}` 
        },
        (payload: any) => {
          const currentSession = getLocalCurrentSession();
          if (!currentSession) return;

          // Nếu đúng session của thiết bị hiện tại và is_active đổi thành false -> Bị logout
          if (payload.new && payload.new.id === currentSession.id && payload.new.is_active === false) {
            console.warn('Realtime: Thiết bị này vừa bị buộc đăng xuất do đăng nhập từ thiết bị mới!');
            onSessionRevokedRef.current();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);
}
