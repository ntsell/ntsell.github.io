import React, { useState, lazy, Suspense } from 'react';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  Eye, 
  MessageSquare, 
  AlertTriangle,
  ArrowUpDown,
  Tag
} from 'lucide-react';
import { Product, ProductCondition, UserProfile } from '../types';
import { Card3DTilt } from './3d/Card3DTilt';
import { FloatingShapesCSS } from './3d/FloatingShapesCSS';

const Hero3DCanvas = lazy(() => import('./3d/Hero3DCanvas'));

interface MarketplaceHomeProps {
  products: Product[];
  currentUser: UserProfile | null;
  pendingCount?: number;
  onSelectProduct: (product: Product) => void;
  onOpenCreateModal: () => void;
  onNavigateToAdmin?: () => void;
}

export const MarketplaceHome: React.FC<MarketplaceHomeProps> = ({
  products,
  currentUser,
  pendingCount = 0,
  onSelectProduct,
  onOpenCreateModal,
  onNavigateToAdmin
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [selectedCondition, setSelectedCondition] = useState('ALL');
  const [priceSort, setPriceSort] = useState<'default' | 'asc' | 'desc'>('default');

  // Lọc sản phẩm
  const filteredProducts = products.filter(p => {
    if (p.status !== 'active') return false;

    const matchesSearch = 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModel = selectedModel === 'ALL' || p.model.includes(selectedModel);
    const matchesCondition = selectedCondition === 'ALL' || p.condition === selectedCondition;

    return matchesSearch && matchesModel && matchesCondition;
  }).sort((a, b) => {
    if (priceSort === 'asc') return a.price - b.price;
    if (priceSort === 'desc') return b.price - a.price;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner thông báo phê duyệt dành riêng cho Admin */}
      {currentUser?.role === 'admin' && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-indigo-50 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black tracking-wider uppercase">
                  Quyền Quản Trị Viên
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  (Đang đăng nhập: {currentUser.displayName})
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                {pendingCount > 0 
                  ? `Có ${pendingCount} bài đăng bán máy đang chờ bạn duyệt!`
                  : 'Hàng đợi duyệt bài đăng hiện đang trống.'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Các bài đăng mới từ học sinh cần Quản trị viên thẩm định Serial Number và ảnh tại <strong>Bảng Quản Trị</strong> trước khi hiển thị công khai trên chợ.
              </p>
            </div>
          </div>

          {onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-indigo-600/20 shrink-0 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Mở Bảng Quản Trị Duyệt Bài ({pendingCount})
            </button>
          )}
        </div>
      )}

      {/* Hero Banner trường học với 3D Three.js & Hiệu ứng kính mờ Glassmorphism phủ nền */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-800/95 via-indigo-900/90 to-slate-950 text-white p-6 sm:p-10 shadow-2xl border border-white/20">
        {/* Layer 3D Parallax & Shapes (Three.js WebGL) */}
        <Suspense fallback={<FloatingShapesCSS />}>
          <Hero3DCanvas />
        </Suspense>

        {/* Lớp kính mờ Glassmorphism (thừa hưởng hiệu ứng thẻ ảnh 1) phủ đè lên background */}
        <div className="absolute inset-0 bg-white/[0.07] backdrop-blur-[2px] rounded-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/30 via-white/5 to-transparent pointer-events-none" />
        <div className="absolute -inset-1 bg-gradient-to-r from-sky-400/15 via-indigo-400/10 to-purple-400/15 rounded-3xl blur-xl -z-10 pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wide uppercase text-blue-100 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Xác thực trường • PII Mã hoá bảo mật</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Sàn Trao Đổi Máy Tính <span className="font-brand-creative font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200">NTSell</span> <span className="font-script-flair text-2xl sm:text-4xl lg:text-5xl text-sky-300 inline-block transform -rotate-3 ml-1">Học Đường</span>
          </h1>

          <p className="text-xs sm:text-base text-blue-100/90 leading-relaxed max-w-xl">
            Trao đổi máy tính Casio FX-580VN, FX-570VN, Flexio giữa học sinh trong trường. 100% giao dịch có biên bản video 5 bước và thẩm định Serial Number chính hãng.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
            <button
              onClick={onOpenCreateModal}
              className="w-full sm:w-auto px-6 py-3 bg-white text-blue-700 font-bold text-xs sm:text-sm rounded-xl hover:bg-blue-50 transition shadow-lg shadow-blue-950/20 text-center"
            >
              Đăng Bán Máy Tính Của Bạn
            </button>
            <a
              href="#filters"
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm rounded-xl backdrop-blur-md border border-white/20 transition text-center shadow-sm"
            >
              Khám Phá Máy Tính ({filteredProducts.length})
            </a>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 bottom-0 w-64 h-64 sm:w-96 sm:h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>



      {/* Dải 4 Thẻ Tính Năng Chiều Sâu 3D Tương Tác */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <Card3DTilt maxTilt={14} className="h-full">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition flex flex-col justify-between h-full space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg shadow-2xs">
              🧮
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900">Thẩm Định Serial 3D</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Mã S/N trên màn hình máy được đối soát chống cào quét trộm.
              </p>
            </div>
          </div>
        </Card3DTilt>

        <Card3DTilt maxTilt={14} className="h-full">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition flex flex-col justify-between h-full space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg shadow-2xs">
              🛡️
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900">Bảo Mật PII Tuyệt Đối</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Tên thật và lớp học được mã hóa lưu trữ an toàn trong cơ sở dữ liệu.
              </p>
            </div>
          </div>
        </Card3DTilt>

        <Card3DTilt maxTilt={14} className="h-full">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition flex flex-col justify-between h-full space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg shadow-2xs">
              📹
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900">Video Test 5 Bước</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Người bán quay video bấm phép tính & kiểm tra màn hình LCD.
              </p>
            </div>
          </div>
        </Card3DTilt>

        <Card3DTilt maxTilt={14} className="h-full">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition flex flex-col justify-between h-full space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-lg shadow-2xs">
              💬
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900">Messenger Học Sinh</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Thương lượng trực tiếp và hẹn gặp test máy ngay tại trường học.
              </p>
            </div>
          </div>
        </Card3DTilt>
      </div>

      {/* Thanh tìm kiếm & bộ lọc đa tiêu chí */}
      <div id="filters" className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo tên máy, mã S/N, model Casio hoặc Flexio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full min-w-0 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
            >
              <option value="ALL">Tất cả Model</option>
              <option value="FX-580VN">Casio FX-580VN X</option>
              <option value="FX-570VN">Casio FX-570VN Plus</option>
              <option value="FX-880BTG">Casio FX-880BTG</option>
              <option value="Flexio">Flexio (Thiên Long)</option>
            </select>

            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full min-w-0 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
            >
              <option value="ALL">Tất cả tình trạng</option>
              <option value="brand_new">Mới tinh (Chưa dùng)</option>
              <option value="like_new">Như mới</option>
              <option value="used_good">Đã qua sử dụng</option>
            </select>

            <select
              value={priceSort}
              onChange={(e) => setPriceSort(e.target.value as any)}
              className="w-full min-w-0 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
            >
              <option value="default">Mới nhất</option>
              <option value="asc">Giá: Thấp đến Cao</option>
              <option value="desc">Giá: Cao đến Thấp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid danh sách máy tính hoặc Trạng thái trống */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs space-y-4 my-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <Tag className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">Chưa có máy tính nào được đăng</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Chợ học đường hiện chưa có sản phẩm nào. Hãy là người đầu tiên đăng bán máy tính Casio hoặc Flexio của bạn!
            </p>
          </div>
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition"
          >
            <Sparkles className="w-4 h-4" /> Đăng Bán Máy Tính Ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <Card3DTilt key={product.id} className="h-full">
              <div
                onClick={() => onSelectProduct(product)}
                className="group h-full bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-2xl transition duration-200 cursor-pointer flex flex-col"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Ảnh đại diện & Badge với chiều sâu 3D */}
                <div 
                  className="relative aspect-4/3 overflow-hidden bg-slate-100"
                  style={{ transform: 'translateZ(16px)' }}
                >
                  <img
                    src={product.imageUrls[0]}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div 
                    className="absolute top-3 left-3 flex flex-col gap-1.5"
                    style={{ transform: 'translateZ(26px)' }}
                  >
                    {product.snStatus === 'genuine' && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> S/N Chính Hãng
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-semibold">
                      {product.condition === 'like_new' ? 'Như mới' : product.condition === 'brand_new' ? 'Mới 100%' : 'Đã qua sử dụng'}
                    </span>
                  </div>

                  {product.demoVideoUrl && (
                    <span 
                      className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-blue-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs"
                      style={{ transform: 'translateZ(24px)' }}
                    >
                      🎬 Video Test
                    </span>
                  )}
                </div>

                {/* Thông tin sản phẩm */}
                <div 
                  className="p-5 flex-1 flex flex-col justify-between space-y-3"
                  style={{ transform: 'translateZ(20px)' }}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-indigo-600">{product.model}</span>
                      <span className="text-slate-400">Chat thỏa thuận</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition">
                      {product.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">Giá thanh toán</span>
                      <span className="text-base font-extrabold text-blue-600">
                        {product.price.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-700 block truncate max-w-[120px]">
                        {product.sellerDisplayName}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center justify-end gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Trust {product.sellerTrustScore}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card3DTilt>
          ))}
        </div>
      )}
    </div>
  );
};
