import React, { useState, lazy, Suspense } from 'react';
import { 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Tag,
  ChevronDown,
  Calculator,
  BookOpen,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Product, UserProfile } from '../types';
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
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'calculator' | 'document'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedCondition, setSelectedCondition] = useState('ALL');
  const [priceSort, setPriceSort] = useState<'default' | 'asc' | 'desc'>('default');

  // Lọc sản phẩm đa danh mục (Máy tính & Tài liệu học tập)
  const filteredProducts = products.filter(p => {
    if (p.status !== 'active') return false;

    const itemCat = p.category || 'calculator';
    const matchesCat = selectedCategory === 'ALL' || itemCat === selectedCategory;
    if (!matchesCat) return false;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      p.title.toLowerCase().includes(searchLower) ||
      (p.model || '').toLowerCase().includes(searchLower) ||
      (p.serialNumber || '').toLowerCase().includes(searchLower) ||
      (p.subject || '').toLowerCase().includes(searchLower) ||
      (p.grade || '').toLowerCase().includes(searchLower) ||
      (p.description || '').toLowerCase().includes(searchLower);

    const matchesModel = itemCat !== 'calculator' || selectedModel === 'ALL' || (p.model && p.model.includes(selectedModel));
    const matchesSubject = itemCat !== 'document' || selectedSubject === 'ALL' || p.subject === selectedSubject;
    const matchesGrade = itemCat !== 'document' || selectedGrade === 'ALL' || p.grade === selectedGrade;
    const matchesCondition = selectedCondition === 'ALL' || p.condition === selectedCondition;

    return matchesSearch && matchesModel && matchesSubject && matchesGrade && matchesCondition;
  }).sort((a, b) => {
    if (priceSort === 'asc') return a.price - b.price;
    if (priceSort === 'desc') return b.price - a.price;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner thông báo phê duyệt dành riêng cho Admin */}
      {currentUser?.role === 'admin' && (
        <div className="bg-white/75 backdrop-blur-xl border border-white/85 rounded-3xl p-4 sm:p-5 shadow-lg shadow-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
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
      <div className="hero-surface relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-800/95 via-indigo-900/90 to-slate-950 text-white p-6 sm:p-10 shadow-2xl border border-white/20">
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
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
            Sàn Trao Đổi Sản Phẩm <span className="font-brand-creative font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-200">NTSell</span> <span className="font-script-flair text-2xl sm:text-4xl lg:text-5xl text-sky-300 inline-block transform -rotate-3 ml-1">Học Đường</span>
          </h1>

          <p className="text-xs sm:text-base text-blue-100/90 leading-relaxed max-w-xl">
            Sàn giao dịch đồ dùng, máy tính cầm tay, sách ôn thi và tài liệu học tập giữa học sinh trong trường. Giao dịch an toàn, minh bạch và bảo mật thông tin.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full sm:w-auto">
            <button
              onClick={onOpenCreateModal}
              className="w-full sm:w-auto px-6 py-3 bg-white text-blue-700 font-bold text-xs sm:text-sm rounded-xl hover:bg-blue-50 transition shadow-lg shadow-blue-950/20 text-center"
            >
              Đăng Bán & Chia Sẻ Đồ Dùng
            </button>
            <a
              href="#filters"
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm rounded-xl backdrop-blur-md border border-white/20 transition text-center shadow-sm"
            >
              Khám Phá Sản Phẩm ({filteredProducts.length})
            </a>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 bottom-0 w-64 h-64 sm:w-96 sm:h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>



      {/* Dải 4 Thẻ Tính Năng Chiều Sâu 3D Tương Tác */}
      <div className="features-grid grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <Card3DTilt maxTilt={14} className="h-full">
          <div className="p-4 sm:p-5 rounded-2xl glass-card glass-card-hover flex flex-col justify-between h-full space-y-2.5 depth-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500/15 to-indigo-500/15 border border-blue-500/20 text-blue-600 flex items-center justify-center font-black text-lg shadow-sm shadow-blue-500/10">
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
          <div className="p-4 sm:p-5 rounded-2xl glass-card glass-card-hover flex flex-col justify-between h-full space-y-2.5 depth-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/15 to-teal-500/15 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-black text-lg shadow-sm shadow-emerald-500/10">
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
          <div className="p-4 sm:p-5 rounded-2xl glass-card glass-card-hover flex flex-col justify-between h-full space-y-2.5 depth-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/15 to-purple-500/15 border border-indigo-500/20 text-indigo-600 flex items-center justify-center font-black text-lg shadow-sm shadow-indigo-500/10">
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
          <div className="p-4 sm:p-5 rounded-2xl glass-card glass-card-hover flex flex-col justify-between h-full space-y-2.5 depth-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500/15 to-pink-500/15 border border-purple-500/20 text-purple-600 flex items-center justify-center font-black text-lg shadow-sm shadow-purple-500/10">
              💬
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-slate-900">Messenger Học Sinh</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Thương lượng trực tiếp và hẹn gặp giao nhận đồ ngay tại trường học.
              </p>
            </div>
          </div>
        </Card3DTilt>
      </div>

      {/* Bộ Chuyển Đổi Danh Mục (Category Tabs): Tất Cả | Máy Tính | Tài Liệu */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 glass-panel rounded-2xl max-w-fit depth-1">
        <button
          type="button"
          onClick={() => {
            setSelectedCategory('ALL');
            setSelectedModel('ALL');
            setSelectedSubject('ALL');
            setSelectedGrade('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tất Cả ({products.filter(p => p.status === 'active').length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('calculator');
            setSelectedModel('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            selectedCategory === 'calculator'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Máy Tính Casio ({products.filter(p => p.status === 'active' && (p.category === 'calculator' || !p.category)).length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory('document');
            setSelectedSubject('ALL');
            setSelectedGrade('ALL');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
            selectedCategory === 'document'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Tài Liệu & Sách Ôn ({products.filter(p => p.status === 'active' && p.category === 'document').length})</span>
        </button>
      </div>

      {/* Thanh tìm kiếm & bộ lọc đa tiêu chí */}
      <div id="filters" className="filter-surface glass-panel rounded-2xl p-4 sm:p-5 space-y-3 depth-2">
        {/* Dòng tìm kiếm full width */}
        <div className="relative w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={
              selectedCategory === 'document'
                ? 'Tìm tên tài liệu, môn học (Toán, Lý, Hóa...), khối lớp, đề cương...'
                : selectedCategory === 'calculator'
                ? 'Tìm theo model Casio FX-580VN, mã S/N, Flexio...'
                : 'Tìm máy tính, tài liệu ôn thi, đề thi, mã S/N...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input w-full pl-11 pr-4 h-11 text-xs sm:text-sm rounded-xl text-slate-900 placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Dòng bộ lọc 3 cột cân đối full width thích ứng theo danh mục */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full">
          {/* Cột 1: Model Casio hoặc Môn học */}
          {selectedCategory === 'document' ? (
            <div className="relative w-full">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="glass-input appearance-none w-full pl-3.5 pr-10 h-11 text-xs sm:text-sm font-semibold text-slate-800 rounded-xl cursor-pointer"
              >
                <option value="ALL">Tất cả Môn học</option>
                <option value="Toán">Môn Toán</option>
                <option value="Ngữ Văn">Môn Ngữ Văn</option>
                <option value="Tiếng Anh">Môn Tiếng Anh</option>
                <option value="Vật Lý">Môn Vật Lý</option>
                <option value="Hóa Học">Môn Hóa Học</option>
                <option value="Sinh Học">Môn Sinh Học</option>
                <option value="Lịch Sử">Môn Lịch Sử</option>
                <option value="Địa Lý">Môn Địa Lý</option>
                <option value="Tin Học">Môn Tin Học</option>
                <option value="GDCD / KTPL">GDCD / KTPL</option>
                <option value="Tổng Hợp / ĐGNL">Tổng Hợp / Ôn ĐGNL</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center pointer-events-none shadow-xs">
                <ChevronDown className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              </div>
            </div>
          ) : (
            <div className="relative w-full">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="glass-input appearance-none w-full pl-3.5 pr-10 h-11 text-xs sm:text-sm font-semibold text-slate-800 rounded-xl cursor-pointer"
              >
                <option value="ALL">Tất cả Model Máy tính</option>
                <option value="FX-580VN">Casio FX-580VN X</option>
                <option value="FX-570VN">Casio FX-570VN Plus</option>
                <option value="FX-880BTG">Casio FX-880BTG</option>
                <option value="Flexio">Flexio (Thiên Long)</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center pointer-events-none shadow-xs">
                <ChevronDown className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              </div>
            </div>
          )}

          {/* Cột 2: Khối Lớp hoặc Tình trạng */}
          {selectedCategory === 'document' ? (
            <div className="relative w-full">
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="glass-input appearance-none w-full pl-3.5 pr-10 h-11 text-xs sm:text-sm font-semibold text-slate-800 rounded-xl cursor-pointer"
              >
                <option value="ALL">Tất cả Khối lớp</option>
                <option value="Lớp 10">Lớp 10</option>
                <option value="Lớp 11">Lớp 11</option>
                <option value="Lớp 12">Lớp 12</option>
                <option value="Ôn Thi THPT">Luyện thi THPT Quốc Gia</option>
                <option value="Ôn Thi ĐGNL/ĐGTD">Ôn thi ĐGNL / ĐGTD</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center pointer-events-none shadow-xs">
                <ChevronDown className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              </div>
            </div>
          ) : (
            <div className="relative w-full">
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="glass-input appearance-none w-full pl-3.5 pr-10 h-11 text-xs sm:text-sm font-semibold text-slate-800 rounded-xl cursor-pointer"
              >
                <option value="ALL">Tất cả tình trạng</option>
                <option value="brand_new">Mới tinh (Chưa dùng)</option>
                <option value="like_new">Như mới</option>
                <option value="used_good">Đã qua sử dụng</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center pointer-events-none shadow-xs">
                <ChevronDown className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              </div>
            </div>
          )}

          {/* Cột 3: Sắp xếp giá */}
          <div className="relative w-full">
            <select
              value={priceSort}
              onChange={(e) => setPriceSort(e.target.value as any)}
              className="glass-input appearance-none w-full pl-3.5 pr-10 h-11 text-xs sm:text-sm font-semibold text-slate-800 rounded-xl cursor-pointer"
            >
              <option value="default">Mới nhất</option>
              <option value="asc">Giá: Thấp đến Cao</option>
              <option value="desc">Giá: Cao đến Thấp</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center pointer-events-none shadow-xs">
              <ChevronDown className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid danh sách máy tính & tài liệu hoặc Trạng thái trống */}
      {filteredProducts.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 my-6 depth-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500/15 to-indigo-500/15 border border-blue-500/20 text-blue-600 flex items-center justify-center mx-auto shadow-sm shadow-blue-500/15">
            <Tag className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">
              {selectedCategory === 'ALL' 
                ? 'Chưa có sản phẩm nào được đăng' 
                : selectedCategory === 'calculator' 
                  ? 'Chưa có máy tính nào được đăng' 
                  : 'Chưa có tài liệu nào được đăng'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {selectedCategory === 'ALL'
                ? 'Chợ học đường hiện chưa có sản phẩm nào. Hãy là người đầu tiên đăng bán máy tính hoặc chia sẻ tài liệu học tập của bạn!'
                : selectedCategory === 'calculator'
                  ? 'Chợ học đường hiện chưa có máy tính Casio hoặc Flexio nào. Hãy là người đầu tiên đăng bán máy tính của bạn!'
                  : 'Chợ học đường hiện chưa có tài liệu học tập nào. Hãy là người đầu tiên chia sẻ tài liệu hoặc đề cương của bạn!'}
            </p>
          </div>
          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/25 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> 
            {selectedCategory === 'document' ? 'Đăng & Chia Sẻ Tài Liệu Ngay' : 'Đăng Bán / Chia Sẻ Ngay'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => {
            const isDoc = product.category === 'document';

            return (
              <Card3DTilt key={product.id} className="h-full">
                <div
                  onClick={() => onSelectProduct(product)}
                  className="product-card group h-full glass-card glass-card-hover rounded-3xl overflow-hidden cursor-pointer flex flex-col depth-2"
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
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div 
                      className="absolute top-3 left-3 flex flex-col gap-1.5"
                      style={{ transform: 'translateZ(26px)' }}
                    >
                      {isDoc ? (
                        <>
                          <span className="px-2.5 py-1 rounded-full bg-indigo-600/90 backdrop-blur-md text-white text-[10px] font-bold shadow-md shadow-indigo-500/25 border border-white/20 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {product.subject || 'Tài Liệu'}
                          </span>
                          {product.grade && (
                            <span className="px-2.5 py-1 rounded-full bg-slate-900/65 backdrop-blur-md text-white text-[10px] font-semibold border border-white/15 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" /> {product.grade}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          {product.snStatus === 'genuine' && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-bold shadow-md shadow-emerald-500/25 border border-white/20 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> S/N Chính Hãng
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-full bg-slate-900/65 backdrop-blur-md text-white text-[10px] font-semibold border border-white/15">
                            {product.condition === 'like_new' ? 'Như mới' : product.condition === 'brand_new' ? 'Mới 100%' : 'Đã qua sử dụng'}
                          </span>
                        </>
                      )}
                    </div>

                    {isDoc ? (
                      <span 
                        className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-md border border-white/20"
                        style={{ transform: 'translateZ(24px)' }}
                      >
                        {product.docFormat === 'digital' ? '📄 File PDF' : '📖 Bản in giấy'}
                      </span>
                    ) : product.demoVideoUrl ? (
                      <span 
                        className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-md shadow-blue-600/30 border border-white/20"
                        style={{ transform: 'translateZ(24px)' }}
                      >
                        🎬 Video Test
                      </span>
                    ) : null}
                  </div>

                  {/* Thông tin sản phẩm */}
                  <div 
                    className="p-5 flex-1 flex flex-col justify-between space-y-3"
                    style={{ transform: 'translateZ(20px)' }}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className={`font-bold tracking-wide uppercase text-[10px] px-2 py-0.5 rounded-md border ${
                          isDoc
                            ? 'bg-purple-50 text-purple-700 border-purple-100/80'
                            : 'bg-indigo-50 text-indigo-600 border-indigo-100/80'
                        }`}>
                          {isDoc ? `${product.subject || 'Tài liệu'} • ${product.grade || 'THPT'}` : product.model}
                        </span>
                        <span className="text-slate-400">Chat trao đổi</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-blue-600 transition">
                        {product.title}
                      </h3>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">
                          {isDoc ? 'Phí chia sẻ' : 'Giá thanh toán'}
                        </span>
                        {product.price === 0 ? (
                          <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Tặng 0đ (Free)
                          </span>
                        ) : (
                          <span className="text-base font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {product.price.toLocaleString('vi-VN')} đ
                          </span>
                        )}
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
            );
          })}
        </div>
      )}
    </div>
  );
};
