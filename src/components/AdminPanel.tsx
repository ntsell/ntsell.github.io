import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Check, 
  X, 
  AlertTriangle, 
  Users, 
  Video, 
  HardDrive, 
  FileCheck, 
  Search, 
  Trash2, 
  RefreshCw,
  Clock,
  Sparkles,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  Tag,
  Layers,
  ExternalLink,
  Ban,
  HelpCircle,
  Edit3,
  Laptop
} from 'lucide-react';
import { Product, Transaction, Dispute, VerificationRequest, UserProfile } from '../types';
import { driveStorage } from '../services/driveStorage';
import { runAutoDeleteVideosJob } from '../services/autoDeleteWorker';
import { AdminSessions } from './AdminSessions';

interface AdminPanelProps {
  products: Product[];
  transactions: Transaction[];
  disputes: Dispute[];
  onApproveProduct: (id: string) => void;
  onRejectProduct: (id: string, reason?: string) => void;
  onRequestEditProduct?: (id: string, reason: string) => void;
  onTakeDownProduct?: (id: string, reason?: string) => void;
  onResolveDispute: (disputeId: string, resolution: any) => void;
  onRefreshProducts?: () => Promise<void> | void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  transactions,
  disputes,
  onApproveProduct,
  onRejectProduct,
  onRequestEditProduct,
  onTakeDownProduct,
  onResolveDispute,
  onRefreshProducts
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'active_products' | 'disputes' | 'storage' | 'roster' | 'sessions'>('products');
  const [cronResult, setCronResult] = useState<any>(null);
  const [isCronRunning, setIsCronRunning] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [rejectProduct, setRejectProduct] = useState<Product | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [requestEditProduct, setRequestEditProduct] = useState<Product | null>(null);
  const [requestEditReason, setRequestEditReason] = useState('');
  const [takeDownProduct, setTakeDownProduct] = useState<Product | null>(null);
  const [takeDownReason, setTakeDownReason] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quản lý yêu cầu xác minh tài khoản từ học sinh không có trong danh sách
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>(() => {
    try {
      const saved = localStorage.getItem('ntsell_verification_requests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const pendingRequests = verificationRequests.filter(r => r.status === 'pending');

  const handleApproveRequest = (id: string) => {
    const updated = verificationRequests.map(r => r.id === id ? { ...r, status: 'approved' as const } : r);
    setVerificationRequests(updated);
    localStorage.setItem('ntsell_verification_requests', JSON.stringify(updated));
    alert('Đã phê duyệt tài khoản học sinh thành công!');
  };

  const handleRejectRequest = (id: string) => {
    const updated = verificationRequests.map(r => r.id === id ? { ...r, status: 'rejected' as const } : r);
    setVerificationRequests(updated);
    localStorage.setItem('ntsell_verification_requests', JSON.stringify(updated));
    alert('Đã từ chối yêu cầu xác minh.');
  };

  const pendingProducts = products.filter(p => p.status === 'pending_admin');
  const activeProducts = products.filter(p => p.status === 'active');
  const driveStatus = driveStorage.getStorageStatus();

  const handleTriggerCron = async () => {
    setIsCronRunning(true);
    const res = await runAutoDeleteVideosJob(transactions, disputes);
    setTimeout(() => {
      setCronResult(res);
      setIsCronRunning(false);
      alert(`Đã hoàn tất rà soát: Quét ${res.scanned} giao dịch. Đã tự động dọn dẹp ${res.cleanedCount} video hoàn tất quá 6 tháng.`);
    }, 800);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[11px] uppercase font-bold text-indigo-600 tracking-wider">Hệ Thống Quản Trị Trung Tâm</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <HardDrive className="w-7 h-7 text-indigo-600" />
            Admin & Moderator Control Center
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {onRefreshProducts && (
            <button
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await onRefreshProducts();
                } finally {
                  setTimeout(() => setIsRefreshing(false), 500);
                }
              }}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Đồng bộ danh sách tức thì từ máy chủ Supabase"
            >
              <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Đang đồng bộ...' : 'Đồng bộ Supabase'}
            </button>
          )}
          <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-indigo-600" />
            API Security: OWASP Hardened
          </span>
          <span className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Hệ thống: $0/Tháng Free Tier
          </span>
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Sản phẩm trên sàn</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{products.length}</p>
          <span className="text-[11px] text-emerald-600 font-medium">100% kiểm tra mã S/N</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Giao dịch thành công</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{transactions.filter(t => t.status === 'completed').length}</p>
          <span className="text-[11px] text-slate-500">Video 5 bước đầy đủ</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Tranh chấp cần xử lý</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{disputes.length}</p>
          <span className="text-[11px] text-rose-600 font-medium">SLA trong 7 ngày</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Google Drive 1 (5TB)</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{driveStatus.percentageUsed}</p>
          <span className="text-[11px] text-slate-500">Còn trống {driveStatus.remainingGB} GB</span>
        </div>
      </div>

      {/* Tab Menu */}
      <div className="flex border-b border-slate-200 text-xs font-bold gap-2">
        <button
          onClick={() => setActiveTab('products')}
          className={`py-3 px-4 border-b-2 transition ${
            activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Duyệt Bài Đăng Chờ Duyệt ({pendingProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('active_products')}
          className={`py-3 px-4 border-b-2 transition ${
            activeTab === 'active_products' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Máy Đang Treo Trên Sàn ({activeProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`py-3 px-4 border-b-2 transition ${
            activeTab === 'disputes' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Xử Lý Khiếu Nại & Tranh Chấp ({disputes.length})
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`py-3 px-4 border-b-2 transition ${
            activeTab === 'storage' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Quản Lý Google Drive (5TB) & Auto-Delete 6 Tháng
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'roster' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Yêu Cầu Xác Minh Tài Khoản ({pendingRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'sessions' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          Quản Lý Phiên Thiết Bị (Sessions)
        </button>
      </div>

      {/* Content 1: Duyệt bài đăng */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-4 rounded-2xl border border-amber-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hàng Đợi Duyệt Yêu Cầu Bán Máy ({pendingProducts.length} máy đang chờ)
                </h3>
                <p className="text-xs text-slate-500">
                  Kiểm tra 4 góc ảnh, đối soát tính xác thực của Serial Number & video test trước khi xuất bản lên Chợ Máy Tính.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              Chế độ phê duyệt 2 chiều
            </span>
          </div>

          {pendingProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 border border-emerald-200">
                <Check className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-slate-800">Không có bài đăng nào đang chờ duyệt!</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Tất cả các yêu cầu đăng bán máy tính từ học sinh đã được thẩm định và phê duyệt lên sàn.
              </p>
            </div>
          ) : (
            pendingProducts.map(p => (
              <div key={p.id} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-4">
                {/* Header card: Thông tin người bán & Thời gian gửi */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {p.sellerDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800">{p.sellerDisplayName}</span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        Gửi lúc: {new Date(p.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" /> Chờ Admin Duyệt
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Trust: {p.sellerTrustScore}/100
                    </span>
                  </div>
                </div>

                {/* Body: Ảnh 4 góc và thông tin chi tiết */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Cột 1: Xem trước 4 góc ảnh */}
                  <div className="md:col-span-5 space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      {p.imageUrls.slice(0, 4).map((img, idx) => (
                        <div 
                          key={idx} 
                          className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs"
                          onClick={() => setPreviewProduct(p)}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                          <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 text-center">
                      Đã nộp đủ {p.imageUrls.length} ảnh thực tế (Bấm vào ảnh để phóng to)
                    </p>
                  </div>

                  {/* Cột 2: Thông số máy & Giá bán */}
                  <div className="md:col-span-4 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                        {p.model}
                      </span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {p.condition === 'like_new' ? 'Như mới (99%)' : p.condition === 'brand_new' ? 'Mới 100%' : 'Đã qua sử dụng'}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-base">{p.title}</h4>
                    
                    <p className="text-sm font-black text-blue-600">
                      {p.price.toLocaleString('vi-VN')} đ
                    </p>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 font-mono space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-sans">Mã S/N:</span>
                        <span className="font-bold text-indigo-700">{p.serialNumber}</span>
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-slate-600 font-sans truncate pt-1 border-t border-slate-200/60">
                          "{p.description}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cột 3: Nút duyệt, yêu cầu sửa, từ chối */}
                  <div className="md:col-span-3 flex flex-col gap-2">
                    <button
                      onClick={() => onApproveProduct(p.id)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Phê Duyệt Cho Lên Sàn
                    </button>

                    <button
                      onClick={() => {
                        setRequestEditProduct(p);
                        setRequestEditReason('');
                      }}
                      className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-amber-200"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" /> Yêu Cầu Sửa / Bổ Sung
                    </button>

                    <button
                      onClick={() => setPreviewProduct(p)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Xem Chi Tiết Thẩm Định
                    </button>

                    <button
                      onClick={() => {
                        setRejectProduct(p);
                        setRejectReason('');
                      }}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-rose-200/60"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Từ Chối (Bỏ Hoàn Toàn)
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Modal xem chi tiết bài đăng chờ duyệt */}
          {previewProduct && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Chi Tiết Yêu Cầu Bán Máy</h3>
                      <p className="text-xs text-slate-500">Mã yêu cầu: #{previewProduct.id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setPreviewProduct(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Toàn bộ 4 ảnh phóng to */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700">Bộ 4 góc ảnh thực tế:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {previewProduct.imageUrls.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1.5 left-1.5 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Góc {idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thông tin đối chiếu */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Tên sản phẩm:</span>
                    <span className="font-bold text-slate-900">{previewProduct.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Giá đăng bán:</span>
                    <span className="font-bold text-blue-600 text-sm">{previewProduct.price.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Dòng máy:</span>
                    <span className="font-bold text-slate-800">{previewProduct.model}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Mã Serial Number:</span>
                    <span className="font-mono font-bold text-indigo-700">{previewProduct.serialNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Người đăng bán:</span>
                    <span className="font-bold text-slate-800">{previewProduct.sellerDisplayName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Độ tin cậy:</span>
                    <span className="font-bold text-emerald-600">{previewProduct.sellerTrustScore} / 100</span>
                  </div>
                </div>

                {previewProduct.description && (
                  <div className="text-xs space-y-1">
                    <span className="text-slate-500 font-medium">Mô tả tình trạng:</span>
                    <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                      {previewProduct.description}
                    </p>
                  </div>
                )}

                {/* Nút phê duyệt, yêu cầu sửa hoặc từ chối */}
                <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      onApproveProduct(previewProduct.id);
                      setPreviewProduct(null);
                    }}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Duyệt Cho Lên Sàn
                  </button>

                  <button
                    onClick={() => {
                      const prod = previewProduct;
                      setPreviewProduct(null);
                      setRequestEditProduct(prod);
                      setRequestEditReason('');
                    }}
                    className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-300 transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4 text-amber-600" /> Báo Thiếu & Yêu Cầu Sửa
                  </button>

                  <button
                    onClick={() => {
                      const prod = previewProduct;
                      setPreviewProduct(null);
                      setRejectProduct(prod);
                      setRejectReason('');
                    }}
                    className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition"
                  >
                    Từ Chối Hẳn
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal 1: Nhập lý do báo thiếu để người bán biết và sửa lại */}
          {requestEditProduct && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
                <div className="flex items-center gap-3 text-amber-600">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-200">
                    <Edit3 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Báo Thiếu & Yêu Cầu Sửa Đổi</h3>
                    <p className="text-xs text-slate-500">Người bán sẽ thấy ghi chú này để sửa và nộp lại</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1 text-slate-600 border border-slate-200">
                  <p><span className="font-semibold text-slate-700">Tên máy:</span> {requestEditProduct.title}</p>
                  <p><span className="font-semibold text-slate-700">Người đăng bán:</span> {requestEditProduct.sellerDisplayName}</p>
                  <p><span className="font-semibold text-slate-700">Mã Serial Number:</span> {requestEditProduct.serialNumber}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Nội dung yêu cầu người bán bổ sung / sửa (hiển thị trực tiếp trên Dashboard người bán):
                  </label>
                  <textarea
                    value={requestEditReason}
                    onChange={(e) => setRequestEditReason(e.target.value)}
                    placeholder="Ví dụ: Thiếu ảnh chụp mặt lưng có tem chống giả Casio; ảnh góc số 2 bị mờ bàn phím; bạn vui lòng cập nhật lại ảnh để Admin duyệt lên sàn nhé..."
                    rows={3}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setRequestEditProduct(null);
                      setRequestEditReason('');
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      const reason = requestEditReason.trim() || 'Admin yêu cầu bổ sung thông tin hoặc chụp lại ảnh rõ nét';
                      onRequestEditProduct?.(requestEditProduct.id, reason);
                      setRequestEditProduct(null);
                      setRequestEditReason('');
                    }}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" />
                    Gửi Yêu Cầu Sửa
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal 2: Từ chối để bỏ hoàn toàn */}
          {rejectProduct && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
                    <XCircle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Từ Chối Bỏ Hoàn Toàn</h3>
                    <p className="text-xs text-slate-500">Loại bỏ bài đăng khỏi hàng đợi duyệt</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1 text-slate-600 border border-slate-200">
                  <p><span className="font-semibold text-slate-700">Tên máy:</span> {rejectProduct.title}</p>
                  <p><span className="font-semibold text-slate-700">Người đăng bán:</span> {rejectProduct.sellerDisplayName}</p>
                  <p><span className="font-semibold text-slate-700">Mã Serial Number:</span> {rejectProduct.serialNumber}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Lý do từ chối bỏ bài đăng:</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Ví dụ: Máy Casio hàng dựng / vi phạm quy chế bán hàng trong trường / thông tin gian lận..."
                    rows={3}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setRejectProduct(null);
                      setRejectReason('');
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => {
                      onRejectProduct(rejectProduct.id, rejectReason);
                      setRejectProduct(null);
                      setRejectReason('');
                    }}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Từ Chối & Bỏ Bài
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content 1.5: Quản lý máy đang treo trên sàn (Khả năng gỡ bài của Admin) */}
      {activeTab === 'active_products' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent p-4 rounded-2xl border border-blue-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Danh Sách Máy Đang Treo Bán Trên Sàn ({activeProducts.length} máy công khai)
                </h3>
                <p className="text-xs text-slate-500">
                  Admin có quyền gỡ máy xuống bất cứ lúc nào nếu nhận phản ánh, phát hiện vi phạm, tem giả hoặc máy đã bán ngoài.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đang hiển thị trực tiếp
            </span>
          </div>

          {activeProducts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <Tag className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-slate-800">Hiện không có máy tính nào đang được rao bán!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeProducts.map(p => (
                <div key={p.id} className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between space-y-3">
                  <div className="flex gap-3">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img src={p.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                          {p.model}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.condition === 'like_new' ? '99%' : p.condition === 'brand_new' ? '100%' : 'Đã dùng'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate" title={p.title}>{p.title}</h4>
                      <p className="text-sm font-black text-blue-600">{p.price.toLocaleString('vi-VN')} đ</p>
                      <p className="text-[11px] text-slate-500 truncate">Người bán: <span className="font-semibold text-slate-700">{p.sellerDisplayName}</span></p>
                      <p className="text-[11px] font-mono text-slate-500">S/N: {p.serialNumber}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sàn công khai
                    </span>
                    <button
                      onClick={() => {
                        setTakeDownProduct(p);
                        setTakeDownReason('');
                      }}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-600" />
                      Gỡ Khỏi Sàn
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal xác nhận gỡ máy khỏi sàn của Admin */}
      {takeDownProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Admin Gỡ Máy Khỏi Sàn</h3>
                <p className="text-xs text-slate-500">Máy sẽ bị ẩn ngay lập tức khỏi chợ trường</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1 text-slate-600 border border-slate-200">
              <p><span className="font-semibold text-slate-700">Tên máy:</span> {takeDownProduct.title}</p>
              <p><span className="font-semibold text-slate-700">Người bán:</span> {takeDownProduct.sellerDisplayName}</p>
              <p><span className="font-semibold text-slate-700">Mã Serial Number:</span> {takeDownProduct.serialNumber}</p>
              <p><span className="font-semibold text-slate-700">Giá bán:</span> {takeDownProduct.price.toLocaleString('vi-VN')} đ</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Lý do gỡ bỏ (lưu vết và thông báo cho người bán):</label>
              <textarea
                value={takeDownReason}
                onChange={(e) => setTakeDownReason(e.target.value)}
                placeholder="Nhập lý do, ví dụ: Bị học sinh báo cáo hàng không trùng khớp tem, serial giả mạo, hình ảnh vi phạm..."
                rows={3}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setTakeDownProduct(null);
                  setTakeDownReason('');
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  if (onTakeDownProduct) {
                    onTakeDownProduct(takeDownProduct.id, takeDownReason);
                  }
                  setTakeDownProduct(null);
                  setTakeDownReason('');
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                Xác Nhận Gỡ Xuống
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content 2: Xử lý khiếu nại tranh chấp */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          {disputes.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
              <ShieldCheck className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">Không có tranh chấp nào cần can thiệp!</p>
              <p className="text-xs text-slate-500 mt-1">Mọi giao dịch tuân thủ quy trình video 5 bước nghiêm túc.</p>
            </div>
          ) : (
            disputes.map(d => (
              <div key={d.id} className="p-5 bg-white rounded-2xl border border-rose-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                    Khiếu nại: {d.reason}
                  </span>
                  <span className="text-xs text-slate-400">Giao dịch #{d.transactionId}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl">
                  "{d.details}"
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Xem video 5 bước và phán quyết:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onResolveDispute(d.id, 'resolved_buyer_favored')}
                      className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl"
                    >
                      Xác Nhận Người Mua Đúng
                    </button>
                    <button
                      onClick={() => onResolveDispute(d.id, 'resolved_seller_favored')}
                      className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl"
                    >
                      Xác Nhận Người Bán Đúng
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Content 3: Quản lý Drive & Auto-delete Worker */}
      {activeTab === 'storage' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-600" />
              Tài Khoản Lưu Trữ Google Drive Hiện Tại
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Bạn đang sử dụng trước 1 tài khoản Google Drive (5TB). Hệ thống sẵn sàng mở rộng sang tài khoản 2 & 3 khi cần.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Tài khoản chính:</span>
              <span className="font-bold text-slate-800">{driveStatus.account}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Dung lượng:</span>
              <span className="font-bold text-indigo-600">{driveStatus.usedCapacity} / {driveStatus.totalCapacity}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Trạng thái:</span>
              <span className="font-bold text-emerald-600">{driveStatus.status}</span>
            </div>
          </div>

          {/* Cron Auto-delete 6 tháng */}
          <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Tiến Trình Cron Tự Động Xóa Video Sau 6 Tháng
                </h4>
                <p className="text-xs text-indigo-800 mt-1">
                  Quét toàn bộ giao dịch thành công. Nếu không có tranh chấp và đã quá 180 ngày &rarr; Tự động xóa video trên Google Drive để bảo vệ quyền riêng tư học sinh.
                </p>
              </div>

              <button
                onClick={handleTriggerCron}
                disabled={isCronRunning}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCronRunning ? 'animate-spin' : ''}`} />
                {isCronRunning ? 'Đang quét...' : 'Chạy Quét Ngay'}
              </button>
            </div>

            {cronResult && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-indigo-200 text-xs text-slate-700 font-mono">
                [OK] Đã quét {cronResult.scanned} bản ghi giao dịch. Đã xử lý giải phóng {cronResult.cleanedCount} video cũ. Giữ lại {cronResult.retainedCount} video tranh chấp.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content 4: Quản lý yêu cầu xác minh tài khoản học sinh (Request Admin Verification) */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent p-4 rounded-2xl border border-purple-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hồ Sơ Yêu Cầu Xác Minh Tài Khoản Học Sinh ({verificationRequests.length} hồ sơ)
                </h3>
                <p className="text-xs text-slate-500">
                  Xử lý hồ sơ học sinh không có trong danh sách gốc (chuyển lớp, mới chuyển trường, sai dấu họ tên). SLA xử lý 24-48 giờ.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-full border border-purple-300">
              {pendingRequests.length} đơn đang chờ duyệt
            </span>
          </div>

          {verificationRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto text-purple-600 border border-purple-200">
                <Check className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-slate-800">Chưa có yêu cầu xác minh tài khoản nào!</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Tất cả học sinh đăng ký tài khoản đều đã khớp với danh sách trường hoặc các đơn trước đó đã được xử lý xong.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {verificationRequests.map(req => (
                <div key={req.id} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                        {req.submittedRealName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{req.submittedRealName}</span>
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Lớp {req.submittedClassName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Gửi lúc: {new Date(req.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      req.status === 'pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : req.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {req.status === 'pending' ? 'Chờ Duyệt (24-48h)' : req.status === 'approved' ? 'Đã Phê Duyệt' : 'Đã Từ Chối'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Email học sinh:</span>
                      <span className="font-semibold text-blue-600">{req.email || 'Không cung cấp'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Lý do gửi:</span>
                      <span className="font-semibold text-slate-800">
                        {req.reason === 'class_transfer' ? 'Chuyển lớp / Đổi ban' :
                         req.reason === 'new_student' ? 'Học sinh mới chuyển vào' :
                         req.reason === 'name_misspelled' ? 'Tên ghi sai dấu' : 'Lý do khác'}
                      </span>
                    </div>
                    {req.reasonNote && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px]">Ghi chú:</span>
                        <p className="text-slate-700 font-normal">{req.reasonNote}</p>
                      </div>
                    )}
                    {req.proofImageUrl && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-400 block text-[11px]">Tệp minh chứng:</span>
                        <span className="font-mono text-purple-600 font-semibold">{req.proofImageUrl}</span>
                      </div>
                    )}
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Từ Chối Đơn
                      </button>
                      <button
                        onClick={() => handleApproveRequest(req.id)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Phê Duyệt Tài Khoản
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content 6: Quản lý phiên thiết bị Sessions */}
      {activeTab === 'sessions' && (
        <AdminSessions />
      )}
    </div>
  );
};
