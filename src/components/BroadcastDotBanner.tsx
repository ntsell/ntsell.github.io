import React, { useState, useEffect } from 'react';
import { Sparkles, Megaphone, X } from 'lucide-react';
import { BroadcastAnnouncement } from '../types';
import { fetchActiveBroadcastFromSupabase } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';

interface BroadcastDotBannerProps {
  initialAnnouncement?: BroadcastAnnouncement | null;
}

export const BroadcastDotBanner: React.FC<BroadcastDotBannerProps> = ({ initialAnnouncement }) => {
  const [announcement, setAnnouncement] = useState<BroadcastAnnouncement | null>(initialAnnouncement || null);
  // animationStage: 'hidden' | 'dot' | 'expanding' | 'expanded' | 'collapsing'
  const [stage, setStage] = useState<'hidden' | 'dot' | 'expanding' | 'expanded' | 'collapsing'>('hidden');

  const triggerAnimation = (data: BroadcastAnnouncement) => {
    setAnnouncement(data);
    // Bước 1: Hiện chấm tròn ở chính giữa
    setStage('dot');

    // Bước 2: Sau 400ms bắt đầu mở rộng dần sang hai bên
    setTimeout(() => {
      setStage('expanding');
    }, 400);

    // Bước 3: Sau 1000ms mở rộng hoàn chỉnh hiển thị nội dung
    setTimeout(() => {
      setStage('expanded');
    }, 1000);

    // Bước 4: Sau khoảng thời gian durationSeconds (mặc định 10s), thu hẹp lại rồi ẩn
    const displayDuration = (data.durationSeconds || 10) * 1000;
    setTimeout(() => {
      setStage('collapsing');
      setTimeout(() => {
        setStage('hidden');
      }, 600);
    }, displayDuration + 1000);
  };

  useEffect(() => {
    // 1. Kiểm tra ban đầu từ Supabase / localStorage
    fetchActiveBroadcastFromSupabase().then(active => {
      if (active && active.isActive) {
        // Kiểm tra xem thông báo này còn trong hạn không
        const createdTime = new Date(active.createdAt).getTime();
        const durationMs = (active.durationSeconds || 10) * 1000;
        const now = Date.now();
        // Nếu mới được tạo trong vòng 3 phút
        if (now - createdTime < durationMs + 180000) {
          triggerAnimation(active);
        }
      }
    });

    // 2. Lắng nghe BroadcastChannel (cho cùng trình duyệt / đa tab)
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('ntsell_announcement_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_ANNOUNCEMENT' && event.data?.payload) {
          triggerAnimation(event.data.payload);
        }
      };
    }

    // 3. Lắng nghe Supabase Realtime (cho nhiều máy/thiết bị khác nhau)
    const channel = supabase
      .channel('realtime_broadcast_announcements')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'broadcast_announcements' },
        (payload) => {
          if (payload.new && payload.new.is_active) {
            triggerAnimation({
              id: payload.new.id,
              message: payload.new.message,
              durationSeconds: payload.new.duration_seconds || 10,
              createdAt: payload.new.created_at,
              isActive: true
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (bc) bc.close();
      supabase.removeChannel(channel);
    };
  }, []);

  if (stage === 'hidden' || !announcement) {
    return null;
  }

  return (
    <div className="relative flex items-center justify-center overflow-hidden py-1 px-1 select-none">
      {/* Giai đoạn 1: Chỉ là 1 chấm tròn xanh phát sáng ở giữa */}
      {stage === 'dot' && (
        <div className="flex items-center justify-center animate-ping duration-500">
          <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/50 ring-4 ring-blue-200" />
        </div>
      )}

      {/* Giai đoạn 2, 3, 4: Mở rộng ra 2 bên hiển thị thông báo với bo góc tròn mượt mà */}
      {(stage === 'expanding' || stage === 'expanded' || stage === 'collapsing') && (
        <div
          className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-indigo-500/25 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden ${
            stage === 'expanding'
              ? 'max-w-[80px] opacity-80 scale-95'
              : stage === 'expanded'
              ? 'max-w-[480px] opacity-100 scale-100'
              : 'max-w-0 opacity-0 scale-75'
          }`}
          style={{ transitionProperty: 'max-width, opacity, transform' }}
        >
          {/* Hiệu ứng chớp sáng & icon loa */}
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Megaphone className="w-3 h-3 text-white animate-bounce" />
          </div>

          {/* Nội dung thông báo phát toàn web */}
          <div className="text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-[120px]">
            <span className="font-extrabold text-amber-300 mr-1.5">[THÔNG BÁO]:</span>
            <span className="text-white drop-shadow-xs">{announcement.message}</span>
          </div>

          {/* Huy hiệu thời gian còn lại hoặc nút đóng nhanh */}
          <button
            onClick={() => setStage('hidden')}
            className="p-0.5 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition shrink-0 ml-1"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
