import React from 'react';
import { 
  Video, 
  CheckCircle2, 
  ShieldAlert, 
  FileCheck, 
  PlaySquare, 
  Volume2, 
  Smartphone, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

export const VideoProtocolGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-indigo-600 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-white/20 backdrop-blur rounded-xl">
            <Video className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs uppercase font-bold tracking-widest bg-white/20 px-3 py-1 rounded-full">
            QUY ĐỊNH BẮT BUỘC KHI GIAO DỊCH OFFLINE
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
          Quy Trình Quay Video Bằng Chứng 5 Bước
        </h1>
        <p className="text-sm text-rose-100 max-w-2xl leading-relaxed">
          Để giải quyết mọi tranh chấp một cách 100% minh bạch, mọi giao dịch mua bán trực tiếp tại trường bắt buộc phải có video kiểm tra máy. Video được lưu trữ bảo mật trên Google Drive nội bộ.
        </p>
      </div>

      {/* 5 Bước quay video */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <PlaySquare className="w-5 h-5 text-blue-600" />
          5 Bước Bắt Buộc Trong Video (Thời Lượng 3 - 5 Phút)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bước 1 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 transition">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                1
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Ghi Nhận Địa Điểm & Người Tham Gia</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-11">
              Quay bao quát địa điểm gặp (khuôn viên trường học, thư viện, cổng trường...). Cả người mua và người bán cùng xuất hiện trong khung hình để xác minh giao dịch công khai, an toàn.
            </p>
          </div>

          {/* Bước 2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 transition">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                2
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Kiểm Tra Ngoại Quan 4 Mặt & Tem S/N</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-11">
              Quay cận cảnh mặt trước, nắp trượt, mặt sau máy và góc cạnh. Rọi rõ <b>Mã Serial Number (S/N)</b> và tem phản quang chống giả Bitex / Thiên Long xem có trùng với bài đăng không.
            </p>
          </div>

          {/* Bước 3 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 transition">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-8 rounded-xl bg-rose-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                3
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Test Bấm Phép Tính & Màn Hình LCD</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-11">
              Bật máy lên màn hình chuẩn. Thực hiện các phép tính mẫu: <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-bold">2+2=</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-bold">√16=</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-bold">10÷2=</code>. Nghiêng các góc để kiểm tra độ đậm màn hình LCD không bị đứt nét.
            </p>
          </div>

          {/* Bước 4 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 transition">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                4
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Ghi Nhận Quá Trình Thanh Toán</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-11">
              • Nếu <b>chuyển khoản</b>: Quay màn hình app ngân hàng thể hiện số tài khoản người nhận, số tiền và màn hình "Giao dịch thành công".<br />
              • Nếu <b>tiền mặt</b>: Quay cảnh trao nhận và đếm tiền.
            </p>
          </div>

          {/* Bước 5 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition md:col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                5
              </span>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                Xác Nhận Giọng Nói Hai Chiều (BẮT BUỘC CẢ 2 CÙNG NÓI)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pl-11">
              Cả 2 học sinh cùng nói to rõ ràng trước camera theo mẫu:
              <br />
              <span className="inline-block mt-2 p-3 bg-emerald-50 rounded-xl text-emerald-900 border border-emerald-200 font-medium italic">
                "Tôi là [Display Name], hôm nay ngày [Ngày/Tháng/Năm] xác nhận đã nhận máy tính Casio FX-580VN X đúng như mô tả và bàn giao tiền thành công."
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* SLA và Xử lý tranh chấp */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" />
          Quy Định SLA & Tự Động Xóa Video Sau 6 Tháng
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-1">Thời Hạn Buyer Xác Nhận</span>
            <p className="text-slate-500">Trong vòng <b>5 ngày</b> kể từ khi Seller upload video. Nếu quá 5 ngày không khiếu nại, hệ thống tự động đánh dấu <b>Hoàn tất</b>.</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-1">Thời Gian Giải Quyết Khiếu Nại</span>
            <p className="text-slate-500">Admin sẽ xem lại toàn bộ <b>Video 5 bước</b> và lịch sử đoạn chat để đưa ra quyết định cuối cùng trong <b>7 ngày</b>.</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-1">Chính Sách Lưu Trữ 6 Tháng</span>
            <p className="text-slate-500">Video giao dịch sẽ được <b>tự động xóa vĩnh viễn</b> sau 6 tháng nếu không có khiếu nại để bảo vệ quyền riêng tư.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
