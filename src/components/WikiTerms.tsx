import React from 'react';
import { 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Scale, 
  HelpCircle, 
  Clock, 
  Lock,
  BookOpen
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
          Quy chế hoạt động của sàn trao đổi đồ dùng & tài liệu học tập học sinh theo nguyên tắc an toàn, minh bạch và tôn trọng quyền riêng tư.
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

      {/* Bảo mật thông tin học sinh & Nghị định 13/2023/NĐ-CP */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-600" />
          4. Chính Sách Bảo Vệ Dữ Liệu Cá Nhân (Tuân Thủ Nghị Định 13/2023/NĐ-CP)
        </h2>
        
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <div>
            <h3 className="font-bold text-slate-800 mb-1">4.1. Nguyên tắc thu thập và phân loại dữ liệu</h3>
            <p>• <b>Dữ liệu cá nhân cơ bản:</b> Họ tên, lớp, mã số học sinh, email và số điện thoại chỉ được thu thập nhằm mục đích xác thực tư cách thành viên nhà trường và duy trì an toàn giao dịch.</p>
            <p>• <b>Mã hóa mạnh mẽ (End-to-End & At-Rest):</b> Mọi thông tin định danh (PII) đều được mã hóa bằng thuật toán chuẩn quân sự AES-GCM 256-bit với dẫn xuất khóa PBKDF2 (100.000 vòng lặp) trước khi lưu trữ.</p>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-1">4.2. Bảo vệ dữ liệu học sinh (Dữ liệu trẻ em & vị thành niên)</h3>
            <p>• Hệ thống chỉ vận hành trong phạm vi nội bộ học sinh trường; việc đăng ký tài khoản thể hiện sự đồng thuận của học sinh và sự giám sát của phụ huynh/nhà trường theo quy định tại Điều 20 Nghị định 13/2023/NĐ-CP.</p>
            <p>• Danh tính thật và thông tin lớp học không bao giờ được hiển thị công khai trên giao diện web — hệ thống luôn tự động tạo Display Name ẩn danh.</p>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-1">4.3. Quyền của chủ thể dữ liệu (Data Subject Rights)</h3>
            <p>Căn cứ Điều 9 Nghị định 13/2023/NĐ-CP, người dùng có các quyền tuyệt đối sau:</p>
            <ul className="list-disc pl-5 space-y-1 my-1 text-slate-700">
              <li><b>Quyền được biết & đồng ý:</b> Được thông báo minh bạch về mục đích xử lý dữ liệu trước khi đăng ký.</li>
              <li><b>Quyền truy cập & đính chính:</b> Được xem hồ sơ cá nhân và gửi yêu cầu đính chính thông tin qua tính năng xác thực Admin.</li>
              <li><b>Quyền xóa dữ liệu (Right to Erasure):</b> Học sinh có quyền yêu cầu xóa toàn bộ dữ liệu cá nhân, bài đăng và lịch sử tin nhắn khi tốt nghiệp hoặc ngừng sử dụng dịch vụ.</li>
              <li><b>Quyền rút lại sự đồng ý:</b> Có thể hủy liên kết tài khoản bất kỳ lúc nào.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-800 mb-1">4.4. Thời hạn lưu trữ và tiêu hủy an toàn</h3>
            <p>• Video xác nhận bàn giao lưu trên Cloud/Drive được <b>tự động xóa vĩnh viễn sau 6 tháng</b> đối với các giao dịch thành công không có tranh chấp.</p>
            <p>• Nhật ký kiểm toán an ninh (Audit Logs) được lưu trữ tối thiểu 12 tháng phục vụ đối soát an toàn thông tin theo quy định pháp luật.</p>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-[11px] text-indigo-900">
            <b>Đầu mối tiếp nhận yêu cầu bảo vệ dữ liệu:</b> Ban Quản Trị Hệ Thống NT-Sell (Phòng Đoàn Thanh Niên / Tin Học trường). Mọi yêu cầu trích xuất hoặc xóa dữ liệu cá nhân sẽ được xử lý trong vòng <b>72 giờ làm việc</b>.
          </div>
        </div>
      </div>

      {/* Quy chế chia sẻ & mua bán tài liệu học tập */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          5. Quy Chế Chia Sẻ & Mua Bán Tài Liệu Học Tập (Sách, Đề Cương, PDF)
        </h2>
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>• <b>Khuyến khích chia sẻ 0đ (Tặng miễn phí):</b> Tinh thần tương thân tương ái giữa các thế hệ học sinh trường. Tài liệu 0đ được ưu tiên duyệt nhanh và ghim huy hiệu "Tài liệu tặng".</p>
          <p>• <b>Quyền tác giả & NXB:</b> Đối với sách in xuất bản, học sinh chỉ được chuyển nhượng sách cũ (đã mua hợp pháp). Nghiêm cấm hành vi photocopy thương mại số lượng lớn xâm phạm bản quyền.</p>
          <p>• <b>Nghiêm cấm tuyệt đối:</b> Không chia sẻ đề thi mật quốc gia chưa công bố, tài liệu sai lệch lịch sử hoặc có nội dung không lành mạnh. Mọi vi phạm sẽ chuyển thẳng Hội Đồng Kỷ Luật nhà trường.</p>
          <p>• <b>Miễn trách nhiệm xác thực mã S/N:</b> Tài liệu học tập không áp dụng quy trình kiểm tra số serial phần cứng và video 5 bước như máy tính điện tử.</p>
        </div>
      </div>
    </div>
  );
};
