// ====================================================================
// COMPONENT CẢNH BÁO ĐĂNG XUẤT TỪ XA DO ĐĂNG NHẬP TỪ THIẾT BỊ KHÁC
// ====================================================================

import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldAlert, LogIn } from 'lucide-react';

interface DeviceWarningProps {
  isOpen: boolean;
  onConfirmLogout: () => void;
}

export const DeviceWarning: React.FC<DeviceWarningProps> = ({
  isOpen,
  onConfirmLogout
}) => {
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(6);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onConfirmLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onConfirmLogout]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-rose-200 text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8 animate-bounce" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            Chế độ Bảo Mật Đơn Thiết Bị (Single-Device)
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Tài Khoản Đã Đăng Nhập Ở Nơi Khác
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tài khoản của bạn vừa được đăng nhập từ một thiết bị hoặc trình duyệt khác. Để bảo vệ dữ liệu và mã Serial Number máy tính, phiên đăng nhập trên thiết bị này đã được tự động ngắt kết nối an toàn.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Tự động chuyển về trang đăng nhập sau <b>{countdown}s</b></span>
        </div>

        <button
          onClick={onConfirmLogout}
          className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          Quay lại Đăng Nhập Ngay
        </button>
      </div>
    </div>
  );
};
