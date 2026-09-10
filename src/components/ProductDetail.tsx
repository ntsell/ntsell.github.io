import React, { useState, lazy, Suspense } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Video, 
  CheckCircle2, 
  Lock,
  MessageSquare,
  Ban,
  AlertTriangle,
  BookOpen,
  GraduationCap,
  FileText
} from 'lucide-react';
import { Product, UserProfile } from '../types';

const Calculator3DViewer = lazy(() => import('./3d/Calculator3DViewer'));

interface ProductDetailProps {
  product: Product;
  currentUser?: UserProfile | null;
  onBack: () => void;
  onStartChat: (product: Product) => void;
  onOpenVideoGuide: () => void;
  onTakeDownProduct?: (id: string, reason?: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  currentUser,
  onBack,
  onStartChat,
  onOpenVideoGuide,
  onTakeDownProduct
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'photos' | '3d'>('photos');
  const [isTakeDownModalOpen, setIsTakeDownModalOpen] = useState(false);
  const [takeDownReason, setTakeDownReason] = useState('');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Nút quay lại */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 glass-card glass-card-hover px-4 py-2.5 rounded-xl cursor-pointer depth-1"
      >
        <ArrowLeft className="w-4 h-4 text-blue-600" />
        Quay lại chợ máy
      </button>

      <div className="glass-panel rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-2 depth-3">
        {/* Cột trái: Gallery ảnh hoặc Mô hình 3D 360° */}
        <div className="p-6 space-y-4 border-b md:border-b-0 md:border-r border-white/70 bg-white/30 backdrop-blur-xl">
          {/* Bộ chuyển đổi: Chỉ hiện nút 3D khi là Máy tính */}
          {product.category !== 'document' ? (
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('photos')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewMode === 'photos'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Ảnh thực tế ({product.imageUrls.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewMode === '3d'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mô hình 3D 360°</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-indigo-50/70 rounded-2xl border border-indigo-100">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900">
                Hình ảnh mục lục & trang mẫu tài liệu ({product.imageUrls.length} ảnh)
              </span>
            </div>
          )}

          {viewMode === '3d' && product.category !== 'document' ? (
            <Suspense fallback={
              <div className="aspect-4/3 rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-white gap-2 border border-slate-800 shadow-xl">
                <Sparkles className="w-6 h-6 text-sky-400 animate-spin" />
                <span className="text-xs font-medium">Đang tải không gian 3D...</span>
              </div>
            }>
              <Calculator3DViewer productTitle={product.title} />
            </Suspense>
          ) : (
            <>
              <div className="aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 border border-white/80 shadow-md relative group">
                <img
                  src={product.imageUrls[activeImageIndex]}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {product.snStatus === 'genuine' && product.category !== 'document' && (
                  <span className="absolute top-3 left-3 bg-emerald-600/95 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-emerald-600/25 border border-white/20 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> S/N Chính Hãng Khớp Database
                  </span>
                )}
                {product.category === 'document' && (
                  <span className="absolute top-3 left-3 bg-indigo-600/95 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-indigo-600/25 border border-white/20 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> {product.subject || 'Tài liệu'} • {product.grade || 'THPT'}
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              <div className="grid grid-cols-4 gap-2.5">
                {product.imageUrls.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      activeImageIndex === idx ? 'border-blue-600 shadow-md shadow-blue-500/20 scale-102' : 'border-white/80 opacity-70 hover:opacity-100 hover:scale-102'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Video test nếu có đối với máy tính */}
          {product.category !== 'document' && product.demoVideoUrl && (
            <div className="p-4 rounded-2xl glass-card border border-blue-200/60 bg-blue-50/50 space-y-2 depth-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-blue-600" />
                  Video Test Bấm Phép Tính (Google Drive)
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200/80">
                  Đã kiểm tra
                </span>
              </div>
              <p className="text-[11px] text-blue-800/90 leading-relaxed">
                Người bán đã quay thử bật máy, ấn phép tính <code className="bg-white/90 px-1 py-0.5 rounded font-bold shadow-xs">2+2=4</code>, <code className="bg-white/90 px-1 py-0.5 rounded font-bold shadow-xs">√16=4</code> và kiểm tra LCD.
              </p>
            </div>
          )}
        </div>

        {/* Cột phải: Thông tin & Hành động */}
        <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md inline-block border ${
                product.category === 'document'
                  ? 'text-purple-700 bg-purple-50/90 border-purple-200'
                  : 'text-indigo-600 bg-indigo-50/80 border-indigo-100'
              }`}>
                {product.category === 'document'
                  ? `Tài Liệu Môn ${product.subject || ''} • ${product.grade || ''}`
                  : product.model}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug mt-2">
                {product.title}
              </h1>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl glass-card border border-white/90 flex items-center justify-between depth-1">
              <div>
                <span className="text-xs text-slate-400 block font-medium">
                  {product.category === 'document' ? 'Phí chia sẻ tài liệu' : 'Giá thanh toán thỏa thuận'}
                </span>
                {product.price === 0 ? (
                  <span className="text-xl font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 inline-block mt-1">
                    Tặng Miễn Phí (0đ)
                  </span>
                ) : (
                  <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {product.price.toLocaleString('vi-VN')} đ
                  </span>
                )}
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200/80 shadow-xs">
                {product.condition === 'like_new' ? 'Như mới' : product.condition === 'brand_new' ? 'Mới 100%' : 'Đã qua sử dụng'}
              </span>
            </div>

            {/* Thông tin người bán ẩn danh */}
            <div className="p-4 rounded-2xl glass-card border border-white/80 space-y-2.5 depth-1">
              <span className="text-xs text-slate-400 font-medium block">Người bán ẩn danh:</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-md shadow-blue-500/25">
                    {product.sellerDisplayName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{product.sellerDisplayName}</p>
                    <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Điểm uy tín Trust Score: {product.sellerTrustScore}/100
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                <Lock className="w-3 h-3 text-slate-400" /> Họ tên thật và lớp học được mã hoá bảo vệ danh tính.
              </p>
            </div>

            {/* Thông số Tài liệu hoặc Mã S/N Máy tính */}
            {product.category === 'document' ? (
              <div className="text-xs space-y-2">
                <span className="font-bold text-slate-700 block">Thông tin chi tiết tài liệu:</span>
                <div className="p-3.5 rounded-xl glass-input space-y-2 border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Môn học:</span>
                    <span className="font-bold text-slate-800">{product.subject || 'Đa môn'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Khối lớp:</span>
                    <span className="font-bold text-slate-800">{product.grade || 'THPT'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Hình thức tài liệu:</span>
                    <span className="font-bold text-indigo-700">
                      {product.docFormat === 'digital' ? 'File PDF (Xem trực tuyến)' : 'Tài liệu in ấn / Sách vở giấy'}
                    </span>
                  </div>
                  {product.pageCount && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Số trang ước tính:</span>
                      <span className="font-bold text-slate-800">{product.pageCount} trang</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500">Địa điểm / Phương thức nhận:</span>
                    <span className="font-semibold text-slate-700 text-right max-w-[200px] truncate">
                      {product.tradeLocation}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-medium">Mã Serial Number (S/N):</span>
                  <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Mặt nạ chống cào trộm S/N
                  </span>
                </div>
                <div className="p-3 rounded-xl glass-input font-mono text-slate-800 font-bold flex items-center justify-between">
                  <span className="tracking-wider">{product.maskedSerialNumber || product.serialNumber}</span>
                  <span className="text-[11px] text-emerald-600 font-sans font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Casio Chính Hãng
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Ký tự bảo mật ở giữa được mã hoá che giấu tự động, chỉ hiển thị đầy đủ khi hai bên xác nhận vào phòng giao dịch trực tiếp.
                </p>
              </div>
            )}

            {/* Mô tả chi tiết */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Mô tả sản phẩm:</span>
              <p className="text-xs text-slate-600 leading-relaxed glass-input p-3.5 rounded-xl border border-slate-200/70">
                {product.description}
              </p>
            </div>
          </div>

          {/* Cụm Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-200/60">
            {currentUser && (currentUser.id === product.sellerId || (currentUser.displayName && currentUser.displayName === product.sellerDisplayName)) ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                Đây là bài đăng của chính bạn
              </div>
            ) : (
              <button
                onClick={() => onStartChat(product)}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                {product.category === 'document' ? 'Nhắn Tin Nhận Tài Liệu / Thỏa Thuận' : 'Nhắn Tin Thương Lượng & Hẹn Gặp'}
              </button>
            )}

            {product.category !== 'document' && (
              <button
                onClick={onOpenVideoGuide}
                className="w-full py-2.5 glass-card glass-card-hover text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Video className="w-4 h-4 text-rose-600" />
                Xem Hướng Dẫn Quay Video Khi Gặp Mặt (5 Bước Bắt Buộc)
              </button>
            )}
            {/* Nút Admin gỡ sản phẩm nếu currentUser là admin */}
            {currentUser?.role === 'admin' && onTakeDownProduct && (
              <div className="pt-2">
                <button
                  onClick={() => setIsTakeDownModalOpen(true)}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5"
                >
                  <Ban className="w-4 h-4 text-rose-600" />
                  Gỡ Máy Tính Này Xuống (Quyền Admin)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal xác nhận gỡ máy của Admin */}
      {isTakeDownModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Gỡ Máy Khỏi Sàn</h3>
                <p className="text-xs text-slate-500">Máy sẽ bị ẩn ngay lập tức khỏi chợ trường</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1 text-slate-600 border border-slate-200">
              <p><span className="font-semibold text-slate-700">Tên máy:</span> {product.title}</p>
              <p><span className="font-semibold text-slate-700">Người bán:</span> {product.sellerDisplayName}</p>
              <p><span className="font-semibold text-slate-700">S/N:</span> {product.maskedSerialNumber || product.serialNumber}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Lý do gỡ bài đăng (sẽ thông báo cho người bán):</label>
              <textarea
                value={takeDownReason}
                onChange={(e) => setTakeDownReason(e.target.value)}
                placeholder="Ví dụ: Hình ảnh mờ không thấy tem chống giả Casio, nghi vấn máy dựng, hoặc người bán yêu cầu hủy..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsTakeDownModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  onTakeDownProduct?.(product.id, takeDownReason);
                  setIsTakeDownModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                Gỡ Sản Phẩm Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
