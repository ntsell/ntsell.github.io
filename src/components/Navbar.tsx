import React, { useState, useRef, useEffect } from 'react';
import { 
  Calculator, 
  ShieldCheck, 
  Video, 
  MessageSquare, 
  PlusCircle, 
  User, 
  FileText, 
  LogOut,
  Sparkles,
  HardDrive,
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  Clock
} from 'lucide-react';
import { UserProfile, AppNotification } from '../types';
import { BroadcastDotBanner } from './BroadcastDotBanner';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: UserProfile | null;
  pendingCount?: number;
  notifications?: AppNotification[];
  onMarkNotificationAsRead?: (notifId: string) => void;
  onClearAllNotifications?: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  pendingCount = 0,
  notifications = [],
  onMarkNotificationAsRead,
  onClearAllNotifications,
  onOpenAuthModal,
  onLogout
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Lọc thông báo dành cho user hiện tại (hoặc hệ thống)
  const myNotifications = currentUser 
    ? notifications.filter(n => n.userId === currentUser.id || (currentUser.role === 'admin' && n.userId === 'admin'))
    : [];

  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);
  const navItems = [
    { id: 'home', label: 'Chợ Máy Tính' },
    { id: 'video_guide', label: 'Quy Trình Video 5 Bước', icon: Video, iconColor: 'text-rose-500' },
    { id: 'chat', label: 'Tin Nhắn', icon: MessageSquare, iconColor: 'text-emerald-600' },
    { id: 'transactions', label: 'Phòng Giao Dịch', icon: ShieldCheck, iconColor: 'text-indigo-600' },
    { id: 'wiki', label: 'Quyền Lợi & Điều Khoản', icon: FileText, iconColor: 'text-slate-500' },
  ];

  // Danh mục tab Mobile dưới đáy - Đầy đủ mọi chức năng, không thiếu mục nào
  const mobileNavItems = [
    { id: 'home', label: 'Chợ máy', icon: Calculator },
    { id: 'create_post', label: 'Đăng bán', icon: PlusCircle },
    { id: 'chat', label: 'Tin nhắn', icon: MessageSquare },
    { id: 'transactions', label: 'Giao dịch', icon: ShieldCheck },
    { id: 'dashboard', label: 'Cá nhân', icon: User },
    ...(currentUser?.role === 'admin' ? [{ id: 'admin', label: 'Quản trị', icon: HardDrive }] : []),
    { id: 'more', label: 'Thêm', icon: Sparkles },
  ];

  // Particle Shatter & Regroup Animation State
  interface TabParticle {
    id: number;
    startX: number;
    startY: number;
    targetDx: number;
    targetDy: number;
    scatterX: number;
    scatterY: number;
    arcY: number;
    size: number;
    color: string;
    flyDelay: number;
  }

  const [particles, setParticles] = React.useState<TabParticle[]>([]);
  const [shatteredSourceTab, setShatteredSourceTab] = React.useState<string | null>(null);
  const [regroupTab, setRegroupTab] = React.useState<string | null>(null);
  const mobileBarRef = React.useRef<HTMLDivElement>(null);
  const mobileTabRefs = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [isMoreMenuOpen, setIsMoreMenuOpen] = React.useState(false);

  const handleMobileTabClick = (tabId: string) => {
    if (tabId === 'more') {
      setIsMoreMenuOpen(prev => !prev);
      return;
    }
    setIsMoreMenuOpen(false);
    if (tabId === currentTab) return;

    const sourceEl = mobileTabRefs.current[currentTab];
    const targetEl = mobileTabRefs.current[tabId];
    const barEl = mobileBarRef.current;

    if (sourceEl && targetEl && barEl) {
      const barRect = barEl.getBoundingClientRect();
      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      // Tâm điểm xuất phát (tab hiện tại) và tâm điểm đích (tab được chọn)
      const srcCenterX = (sourceRect.left + sourceRect.width / 2) - barRect.left;
      const srcCenterY = (sourceRect.top + sourceRect.height / 2) - barRect.top;
      const dstCenterX = (targetRect.left + targetRect.width / 2) - barRect.left;
      const dstCenterY = (targetRect.top + targetRect.height / 2) - barRect.top;

      const deltaX = dstCenterX - srcCenterX;
      const deltaY = dstCenterY - srcCenterY;

      // 1. NGAY LẬP TỨC: Xóa đánh dấu tab cũ (nổ tan biến)
      const oldTab = currentTab;
      setShatteredSourceTab(oldTab);

      // 2. SINH 22 HẠT SÁNG NGHỆ THUẬT VỚI THỜI GIAN BAY NỐI ĐUÔI NHAU TỪNG HẠT MỘT
      const colors = [
        '#2563eb', '#3b82f6', '#60a5fa', '#4f46e5', '#818cf8', 
        '#a855f7', '#06b6d4', '#38bdf8', '#6366f1', '#2dd4bf'
      ];
      
      const newParticles: TabParticle[] = Array.from({ length: 22 }).map((_, idx) => {
        // Góc văng xung quanh 360 độ
        const angle = (Math.PI * 2 * idx) / 22 + (Math.random() - 0.5) * 0.4;
        const scatterDist = 16 + Math.random() * 24;
        // Độ võng cung vồng lên khi bay (arc trajectory)
        const arcY = -(24 + Math.random() * 28);
        // Từng hạt nối đuôi nhau bay sang (stagger delay)
        const flyDelay = idx * 0.022; // cách nhau 22ms tạo hiệu ứng chuỗi sao băng

        return {
          id: Date.now() + idx,
          startX: srcCenterX,
          startY: srcCenterY,
          targetDx: deltaX,
          targetDy: deltaY,
          scatterX: Math.cos(angle) * scatterDist,
          scatterY: Math.sin(angle) * scatterDist * 0.6,
          arcY,
          size: 3 + Math.floor(Math.random() * 5), // 3px - 8px
          color: colors[idx % colors.length],
          flyDelay
        };
      });

      setParticles(newParticles);

      // 3. KHI CÁC HẠT CUỐI CÙNG TỤ HỘI VỀ ĐÍCH: Kích hoạt ghép lại tab mới và nhún đàn hồi
      setTimeout(() => {
        setCurrentTab(tabId);
        setShatteredSourceTab(null);
        setRegroupTab(tabId);
        setTimeout(() => setRegroupTab(null), 450);
      }, 540);

      // 4. DỌN SẠCH HẠT KHI KẾT THÚC HÀNH TRÌNH CHUỖI
      setTimeout(() => {
        setParticles([]);
      }, 1150);
    } else {
      setCurrentTab(tabId);
    }
  };

  // Desktop tab indicator style and animation
  const [indicatorStyle, setIndicatorStyle] = React.useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [transitionStyle, setTransitionStyle] = React.useState<string>('none');
  const [isJellyStretching, setIsJellyStretching] = React.useState(false);
  const [movingTabTarget, setMovingTabTarget] = React.useState<string | null>(null);
  const navRef = React.useRef<HTMLElement>(null);
  const tabRefs = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const animationTimers = React.useRef<any[]>([]);

  const handleDesktopTabClick = (tabId: string) => {
    if (tabId === currentTab) return;

    // Dọn các timer cũ nếu click liên tục
    animationTimers.current.forEach(t => clearTimeout(t));
    animationTimers.current = [];

    const sourceEl = tabRefs.current[currentTab];
    const targetEl = tabRefs.current[tabId];
    const navEl = navRef.current;

    if (sourceEl && targetEl && navEl) {
      const navRect = navEl.getBoundingClientRect();
      const srcRect = sourceEl.getBoundingClientRect();
      const dstRect = targetEl.getBoundingClientRect();

      const srcLeft = srcRect.left - navRect.left;
      const srcWidth = srcRect.width;
      const srcRight = srcLeft + srcWidth;

      const dstLeft = dstRect.left - navRect.left;
      const dstWidth = dstRect.width;
      const dstRight = dstLeft + dstWidth;

      // Toạ độ khối bao phủ cả 2 tab
      const combinedLeft = Math.min(srcLeft, dstLeft);
      const combinedRight = Math.max(srcRight, dstRight);
      const combinedWidth = combinedRight - combinedLeft;

      // Xác định ngay tab đích để chuyển màu chữ mượt mà
      setMovingTabTarget(tabId);
      setIsJellyStretching(true);

      // Đảm bảo khối xuất phát từ tab hiện tại mà không có transition trước khi kéo dãn
      setTransitionStyle('none');
      setIndicatorStyle({
        left: srcLeft,
        width: srcWidth,
      });

      // BƯỚC 1: Vươn dài một đầu đến hết tab đích (Stretch) - Curve gia tốc tự nhiên
      requestAnimationFrame(() => {
        setTransitionStyle('left 260ms cubic-bezier(0.2, 0.9, 0.3, 1), width 260ms cubic-bezier(0.2, 0.9, 0.3, 1), transform 260ms ease-out');
        setIndicatorStyle({
          left: combinedLeft,
          width: combinedWidth,
        });

        // BƯỚC 2: Rút ngược bên kia lại với hiệu ứng lò xo bật nảy (Spring Snapping)
        const t1 = setTimeout(() => {
          // Cubic-bezier với điểm overshoot (1.45) tạo độ nhún đàn hồi jelly chân thực
          setTransitionStyle('left 320ms cubic-bezier(0.34, 1.45, 0.64, 1), width 320ms cubic-bezier(0.34, 1.45, 0.64, 1), transform 320ms ease-out');
          setIndicatorStyle({
            left: dstLeft,
            width: dstWidth,
          });

          // Kích hoạt tab active mới
          setCurrentTab(tabId);

          const t2 = setTimeout(() => {
            setIsJellyStretching(false);
            setMovingTabTarget(null);
            setTransitionStyle('none');
          }, 340);
          animationTimers.current.push(t2);
        }, 210);

        animationTimers.current.push(t1);
      });
    } else {
      setCurrentTab(tabId);
    }
  };

  // Đo vị trí ban đầu và khi resize cửa sổ
  React.useLayoutEffect(() => {
    const updateStaticPosition = () => {
      const activeEl = tabRefs.current[currentTab];
      if (activeEl && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        const targetLeft = activeRect.left - navRect.left;
        const targetWidth = activeRect.width;

        if (targetWidth > 0) {
          setTransitionStyle('none');
          setIndicatorStyle({
            left: targetLeft,
            width: targetWidth,
          });
        }
      }
    };

    updateStaticPosition();

    const handleResize = () => updateStaticPosition();
    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (navRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateStaticPosition());
      resizeObserver.observe(navRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [currentTab]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tên nền tảng */}
          <div 
            onClick={() => setCurrentTab('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Calculator className="w-6 h-6" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <div className="flex items-baseline gap-1 select-none overflow-visible">
                  <span className="font-script-flair text-2xl text-blue-600 inline-block drop-shadow-xs hover:scale-105 transition-transform leading-normal px-1">
                    NTSell
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block mb-1.5 animate-pulse"></span>
                </div>
                
                {/* Huy hiệu vai trò tài khoản: Tùy chỉnh theo tài khoản hiện tại (Admin / Học Sinh) */}
                <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap ${
                  currentUser?.role === 'admin'
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-200/80'
                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200/60'
                }`}>
                  {currentUser?.role === 'admin' ? 'Quản Trị' : 'Học Sinh'}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase px-1 -mt-0.5">
                MarketPlace
              </p>
            </div>
          </div>

          {/* Nav Items với Khối Xanh Trượt Co Dãn (Stretch & Pull Elastic Indicator) */}
          <nav 
            ref={navRef} 
            className="relative hidden md:flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-inner"
          >
            {/* Khối nền xanh mở rộng 1 bên đến tab được chọn rồi rút ngược bên kia lại với viền sáng & bóng nịnh mắt */}
            {indicatorStyle.width > 0 && (
              <span
                className={`absolute top-1 bottom-1 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 shadow-md shadow-blue-600/35 pointer-events-none will-change-[left,width,transform] ${
                  isJellyStretching ? 'scale-y-[0.93]' : 'scale-y-100'
                }`}
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                  transition: transitionStyle,
                }}
              >
                {/* Vệt sáng bóng kính (Glossy Highlight) tạo cảm giác 3D thủy tinh hiện đại */}
                <span className="absolute inset-x-0 top-0 h-[38%] rounded-t-lg bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                <span className="absolute inset-0 rounded-lg ring-1 ring-white/20 pointer-events-none" />
              </span>
            )}

            {navItems.map((item) => {
              const isActive = currentTab === item.id || movingTabTarget === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  ref={(el) => { tabRefs.current[item.id] = el; }}
                  onClick={() => handleDesktopTabClick(item.id)}
                  className={`relative z-10 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 select-none ${
                    isActive 
                      ? 'text-white drop-shadow-xs font-bold' 
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/40'
                  }`}
                >
                  {Icon && (
                    <Icon className={`w-4 h-4 transition-all duration-300 ${isActive ? 'text-white scale-110 drop-shadow-xs' : item.iconColor}`} />
                  )}
                  <span className="transition-transform duration-200">{item.label}</span>
                  {item.id === 'chat' && myNotifications.some(n => n.type === 'new_message' && !n.isRead) && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Chấm tròn thông báo toàn web mở rộng sang 2 bên (Broadcast Dot Announcement) */}
          <div className="flex-1 max-w-[420px] mx-2 hidden lg:flex items-center justify-center">
            <BroadcastDotBanner />
          </div>

          {/* Action buttons & User profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentTab('create_post')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Đăng Bán Máy
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                    currentUser.role === 'admin' ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-blue-600'
                  }`}>
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold text-slate-900 leading-tight">
                      {currentUser.displayName}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-medium leading-none flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Trust: {currentUser.trustScore}/100
                    </p>
                  </div>
                </button>

                {/* Nút Chuông Thông Báo (Realtime Notifications) */}
                <div className="relative" ref={notifDropdownRef}>
                  <button
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    title="Thông báo hệ thống"
                    className={`relative p-2 rounded-lg transition ${
                      isNotifOpen 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown danh sách thông báo */}
                  {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-blue-600" />
                          <h4 className="text-xs font-bold text-slate-900">Thông Báo Của Bạn</h4>
                          {unreadCount > 0 && (
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {unreadCount} chưa đọc
                            </span>
                          )}
                        </div>
                        {myNotifications.length > 0 && onClearAllNotifications && (
                          <button
                            onClick={() => {
                              onClearAllNotifications();
                            }}
                            className="text-[11px] text-slate-400 hover:text-slate-700 font-medium"
                          >
                            Xóa tất cả
                          </button>
                        )}
                      </div>

                      <div className="max-h-84 overflow-y-auto divide-y divide-slate-100">
                        {myNotifications.length === 0 ? (
                          <div className="p-6 text-center space-y-2 text-slate-400">
                            <Bell className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                            <p className="text-xs font-medium">Hiện không có thông báo nào</p>
                            <p className="text-[10px] text-slate-400">
                              Khi có ai nhắn tin hoặc Admin duyệt bài đăng máy của bạn, thông báo sẽ hiển thị ở đây.
                            </p>
                          </div>
                        ) : (
                          myNotifications.map(n => {
                            const isNewMsg = n.type === 'new_message';
                            const isApproved = n.type === 'product_approved';
                            const isRejected = n.type === 'product_rejected';
                            const isFlagged = n.type === 'product_flagged';

                            return (
                              <div
                                key={n.id}
                                onClick={() => {
                                  if (onMarkNotificationAsRead) onMarkNotificationAsRead(n.id);
                                  if (n.linkTab) setCurrentTab(n.linkTab);
                                  setIsNotifOpen(false);
                                }}
                                className={`p-3.5 flex items-start gap-3 cursor-pointer transition text-left ${
                                  !n.isRead ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${
                                  isApproved ? 'bg-emerald-100 text-emerald-600' :
                                  isRejected ? 'bg-rose-100 text-rose-600' :
                                  isFlagged ? 'bg-amber-100 text-amber-600' :
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  {isApproved && <CheckCircle2 className="w-4 h-4" />}
                                  {isRejected && <AlertCircle className="w-4 h-4" />}
                                  {isFlagged && <AlertCircle className="w-4 h-4" />}
                                  {isNewMsg && <MessageSquare className="w-4 h-4" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <h5 className={`text-xs truncate ${!n.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                      {n.title}
                                    </h5>
                                    {!n.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5 line-clamp-2">
                                    {n.message}
                                  </p>
                                  <span className="text-[10px] text-slate-400 mt-1 block">
                                    {new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(n.createdAt).toLocaleDateString('vi-VN')}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {myNotifications.length > 0 && (
                        <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                          <button
                            onClick={() => {
                              myNotifications.forEach(n => onMarkNotificationAsRead?.(n.id));
                            }}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                          >
                            Đánh dấu tất cả là đã đọc
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setCurrentTab('admin')}
                    title="Bảng Quản Trị Hệ Thống"
                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition font-bold text-xs shadow-xs"
                  >
                    <HardDrive className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline">Quản Trị</span>
                    {pendingCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-black rounded-full animate-bounce">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={onLogout}
                  title="Đăng xuất"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-md shadow-blue-600/25"
              >
                <User className="w-4 h-4" />
                Tạo Tài Khoản / Đăng Nhập
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Broadcast Banner (Hiện dưới thanh header trên mobile) */}
      <div className="lg:hidden border-t border-slate-100 bg-slate-50/50 py-1 px-2 flex items-center justify-center">
        <BroadcastDotBanner />
      </div>
    </header>

    {/* Mobile More Menu Drawer Sheet */}
    {isMoreMenuOpen && (
      <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div 
          className="absolute inset-0"
          onClick={() => setIsMoreMenuOpen(false)}
        />
        <div className="relative bg-white rounded-t-3xl border-t border-slate-200 p-5 shadow-2xl space-y-4 max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Mục Khác & Hướng Dẫn</h4>
            <button 
              onClick={() => setIsMoreMenuOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              onClick={() => {
                setCurrentTab('video_guide');
                setIsMoreMenuOpen(false);
              }}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition ${
                currentTab === 'video_guide' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50/80 border-slate-200/80 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900">Quy Trình Video 5 Bước</p>
                <p className="text-[11px] text-slate-500 truncate">Quy định quay video bằng chứng khi giao dịch offline</p>
              </div>
            </button>

            <button
              onClick={() => {
                setCurrentTab('wiki');
                setIsMoreMenuOpen(false);
              }}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition ${
                currentTab === 'wiki' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50/80 border-slate-200/80 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900">Quyền Lợi & Điều Khoản</p>
                <p className="text-[11px] text-slate-500 truncate">Quy chế miễn trừ trách nhiệm và an toàn học sinh</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Mobile Fixed Bottom App Navigation Bar */}
    <nav
      ref={mobileBarRef}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-slate-200/80 bg-white/95 backdrop-blur-md justify-around py-2 px-1 text-[11px] select-none shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[calc(env(safe-area-inset-bottom)+8px)]"
    >
      {/* Lớp hạt tan vỡ bay qua tab được chọn (Particle Shatter & Fly Layer) */}
      {particles.map(p => (
        <span
          key={p.id}
          className="tab-particle"
          style={{
            left: `${p.startX}px`,
            top: `${p.startY}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            ['--target-dx' as any]: `${p.targetDx}px`,
            ['--target-dy' as any]: `${p.targetDy}px`,
            ['--scatter-x' as any]: `${p.scatterX}px`,
            ['--scatter-y' as any]: `${p.scatterY}px`,
            ['--arc-y' as any]: `${p.arcY}px`,
            ['--fly-delay' as any]: `${p.flyDelay}s`,
          }}
        />
      ))}

      {mobileNavItems.map((item) => {
        const isShatteringThis = shatteredSourceTab === item.id;
        const isActive = (currentTab === item.id || (item.id === 'more' && (currentTab === 'video_guide' || currentTab === 'wiki' || isMoreMenuOpen))) && !isShatteringThis;
        const isRegrouping = regroupTab === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            ref={(el) => { mobileTabRefs.current[item.id] = el; }}
            onClick={() => handleMobileTabClick(item.id)}
            className={`flex flex-col items-center gap-0.5 transition-all duration-150 flex-1 max-w-[68px] ${
              isActive ? 'text-blue-600 font-extrabold scale-105' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <div 
              className={`relative p-1.5 rounded-xl transition-all ${
                isActive ? 'bg-blue-100 text-blue-600 shadow-xs' : ''
              } ${isShatteringThis ? 'tab-shatter-vanish' : ''} ${isRegrouping ? 'tab-regroup-snap' : ''}`}
            >
              <Icon className="w-5 h-5" />
              {item.id === 'admin' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white animate-bounce">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
              {item.id === 'chat' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full border border-white animate-pulse" />
              )}
              {item.id === 'dashboard' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  </>
  );
};
