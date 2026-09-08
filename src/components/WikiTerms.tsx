import React from 'react';
import { 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Scale, 
  HelpCircle, 
  Clock, 
  Lock 
} from 'lucide-react';

export const WikiTerms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="text-[11px] uppercase font-bold text-blue-600 tracking-wider">Tài Liệu Hướng Dẫn & Pháp Lý</span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
          <Scale className="w-7 h-7 text-indigo-600" />
          Điều Khoản, Quyền Lợi & Miễn Trách Nhiệm
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quy chế hoạt động của sàn trao đổi máy tính học sinh theo nguyên tắc an toàn, minh bạch và tôn trọng quyền riêng tư.
        </p>
      </div>

      {/* Tuyên bố miễn trừ trách nhiệm */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          1. Tuyên Bố Miễn Trừ Trách Nhiệm (Disclaimer)
        </h2>
        <p className="text-xs text-amber-950 leading-relaxed">
          Nền tảng đóng vai trò là <b>cầu nối trung gian công nghệ</b> giúp kết nối người mua và người bán là học sinh trong trường:
        </p>
        <ul className="text-xs text-amber-900 space-y-1.5 list-disc pl-5">
          <li><b>Admin KHÔNG nhận máy để trực tiếp test chất lượng</b>: Trách nhiệm kiểm tra thuộc về hai bên khi gặp mặt trực tiếp.</li>
          <li><b>Admin CHỈ DUYỆT TÍNH HỢP LỆ</b>: Kiểm tra hình ảnh rõ ràng, mã Serial Number có thật và ngăn chặn tài khoản giả mạo.</li>
          <li><b>Mọi phán quyết tranh chấp dựa 100% trên Video 5 bước</b> và biên bản chat không thể xóa.</li>
        </ul>
      </div>

      {/* Trách nhiệm của Người bán */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          2. Quyền Lợi & Nghĩa Vụ Của Người Bán (Seller)
        </h2>
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>• <b>Nghĩa vụ:</b> Mô tả trung thực tình trạng máy tính (đã thay pin, có xước không), quay video 5 bước khi gặp người mua, giao đúng máy có mã S/N đã đăng tải.</p>
          <p>• <b>Quyền lợi:</b> Danh tính thật được bảo vệ (chỉ hiện Display Name). Sau 5 ngày kể từ khi tải video mà người mua không phản hồi, giao dịch tự động hoàn tất và người bán nhận đủ tiền.</p>
          <p>• <b>Chế tài:</b> Bán hàng giả, tráo mã S/N hoặc làm video giả mạo sẽ bị <b>khóa tài khoản vĩnh viễn</b> và chuyển hồ sơ lên Ban Giám Hiệu nhà trường.</p>
        </div>
      </div>

      {/* Trách nhiệm của Người mua */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          3. Quyền Lợi & Nghĩa Vụ Của Người Mua (Buyer)
        </h2>
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>• <b>Nghĩa vụ:</b> Kiểm tra trực tiếp máy tính khi gặp mặt (bấm phép tính 2+2=, tính căn bậc 2, nghiêng góc LCD). Đọc to câu xác nhận trong video.</p>
          <p>• <b>Quyền lợi:</b> Được từ chối nhận máy nếu ngoại quan khác xa ảnh chụp. Được khiếu nại trong vòng 48h nếu phát hiện lỗi ẩn chưa từng được thông báo.</p>
          <p>• <b>Lưu ý:</b> Sau khi đã ấn "Xác nhận nhận hàng", người mua <b>không được yêu cầu hoàn tiền</b>.</p>
        </div>
      </div>

      {/* Bảo mật thông tin học sinh */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-600" />
          4. Chính Sách Bảo Vệ Dữ Liệu Cá Nhân (GDPR & PII)
        </h2>
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>• Tên thật, lớp học và số điện thoại được <b>mã hoá</b> trong cơ sở dữ liệu.</p>
          <p>• Tuyệt đối không chia sẻ thông tin học sinh cho bên thứ ba hoặc các đơn vị quảng cáo.</p>
          <p>• Video giao dịch trên Google Drive <b>tự động xóa vĩnh viễn sau 6 tháng</b> đối với các giao dịch hoàn tất không có tranh chấp.</p>
        </div>
      </div>
    </div>
  );
};
