import React, { useState, lazy, Suspense } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Video, 
  CheckCircle2, 
  MessageSquare, 
  AlertCircle, 
  Share2, 
  Heart,
  ChevronRight,
  Lock,
  Ban,
  AlertTriangle,
  Box
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
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition shadow-2xs"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại chợ máy
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Cột trái: Gallery 4 ảnh hoặc Mô hình 3D 360° */}
        <div className="p-6 space-y-4 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50">
          {/* Bộ chuyển đổi: Ảnh chụp thực tế vs Mô hình 3D */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setViewMode('photos')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === 'photos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Ảnh thực tế ({product.imageUrls.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mô hình 3D 360°</span>
            </button>
          </div>

          {viewMode === '3d' ? (
            <Suspense fallback={
              <div className="aspect-4/3 rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-white gap-2 border border-slate-800">
                <Sparkles className="w-6 h-6 text-sky-400 animate-spin" />
                <span className="text-xs font-medium">Đang tải không gian 3D...</span>
              </div>
            }>
              <Calculator3DViewer productTitle={product.title} />
            </Suspense>
          ) : (
            <>
              <div className="aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 relative">
                <img
                  src={product.imageUrls[activeImageIndex]}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {product.snStatus === 'genuine' && (
                  <span className="absolute top-3 left-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> S/N Chính Hãng Khớp Database
                  </span>
                )}
              </div>

              {/* Thumbnails 4 góc bắt buộc */}
              <div className="grid grid-cols-4 gap-2">
                {product.imageUrls.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition ${
                      activeImageIndex === idx ? 'border-blue-600 shadow-xs' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Video test nếu có */}
          {product.demoVideoUrl && (
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-blue-600" />
                  Video Test Bấm Phép Tính (Google Drive)
                </span>
                <span className="text-[10px] bg-blue-200/80 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                  Đã kiểm tra
                </span>
              </div>
              <p className="text-[11px] text-blue-800">
                Người bán đã quay thử bật máy, ấn phép tính <code className="bg-white px-1 py-0.5 rounded font-bold">2+2=4</code>, <code className="bg-white px-1 py-0.5 rounded font-bold">√16=4</code> và kiểm tra LCD.
              </p>
            </div>
          )}
        </div>

        {/* Cột phải: Thông tin máy & Hành động */}
        <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                {product.model}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug mt-1">
                {product.title}
              </h1>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Giá thanh toán thỏa thuận</span>
                <span className="text-2xl font-black text-blue-600">
                  {product.price.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-bold">
                {product.condition === 'like_new' ? 'Như mới' : product.condition === 'brand_new' ? 'Mới 100%' : 'Đã qua sử dụng'}
              </span>
            </div>

            {/* Thông tin người bán ẩn danh */}
            <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs text-slate-400 font-medium block">Người bán ẩn danh:</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                    {product.sellerDisplayName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{product.sellerDisplayName}</p>
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Điểm uy tín Trust Score: {product.sellerTrustScore}/100
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                <Lock className="w-3 h-3" /> Họ tên thật và lớp học được mã hoá bảo vệ danh tính.
              </p>
            </div>

            {/* Mã Serial Number với cơ chế mặt nạ chống đánh cắp */}
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span>Mã Serial Number (S/N):</span>
                <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Mặt nạ chống cào trộm S/N
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 font-mono text-slate-800 font-bold flex items-center justify-between">
                <span className="tracking-wider">{product.maskedSerialNumber || product.serialNumber}</span>
                <span className="text-[11px] text-emerald-600 font-sans font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Casio Chính Hãng
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Ký tự bảo mật ở giữa được mã hoá che giấu tự động, chỉ hiển thị đầy đủ khi hai bên xác nhận vào phòng giao dịch trực tiếp.
              </p>
            </div>

            {/* Mô tả chi tiết */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700">Mô tả sản phẩm:</span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {product.description}
              </p>
            </div>
          </div>

          {/* Cụm Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            {currentUser && (currentUser.id === product.sellerId || (currentUser.displayName && currentUser.displayName === product.sellerDisplayName)) ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-600" />
                Đây là bài đăng máy tính của chính bạn
              </div>
            ) : (
              <button
                onClick={() => onStartChat(product)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Nhắn Tin Thương Lượng & Hẹn Gặp
              </button>
            )}

            <button
              onClick={onOpenVideoGuide}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <Video className="w-4 h-4 text-rose-600" />
              Xem Hướng Dẫn Quay Video Khi Gặp Mặt (5 Bước Bắt Buộc)
            </button>
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
