import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  Package, 
  Clock, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  Edit3,
  Trash2
} from 'lucide-react';
import { UserProfile, Product, Transaction } from '../types';
import { moderateDisplayName } from '../services/geminiModeration';

interface UserDashboardProps {
  currentUser: UserProfile;
  products: Product[];
  transactions: Transaction[];
  onUpdateDisplayName: (newName: string) => void;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onNavigateToAdmin?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  products,
  transactions,
  onUpdateDisplayName,
  onEditProduct,
  onDeleteProduct,
  onNavigateToAdmin
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(currentUser.displayName);
  const [modError, setModError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const myProducts = products.filter(p => p.sellerId === currentUser.id || p.sellerDisplayName === currentUser.displayName);
  const myTransactions = transactions.filter(t => t.buyerId === currentUser.id || t.sellerId === currentUser.id);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setModError('');
    setIsChecking(true);

    const res = await moderateDisplayName(newDisplayName);
    setIsChecking(false);

    if (!res.isValid) {
      setModError(res.reason || 'Tên hiển thị vi phạm quy tắc cộng đồng học sinh.');
      return;
    }

    onUpdateDisplayName(newDisplayName.trim());
    setIsEditingName(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Profile Header */}
      <div className="glass-panel rounded-3xl p-6 depth-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-500/25 ring-2 ring-white/50">
            {currentUser.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{currentUser.displayName}</h1>
              {currentUser.role === 'admin' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-black flex items-center gap-1 border border-indigo-200 uppercase tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> ADMIN
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Học Sinh Đã Xác Thực
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Đã tham gia: {new Date(currentUser.createdAt).toLocaleDateString('vi-VN')}</span>
              <span>•</span>
              <span className="text-indigo-600 font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" /> PII Được Mã hoá
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'admin' && onNavigateToAdmin && (
            <button
              onClick={onNavigateToAdmin}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> Mở Bảng Quản Trị (Admin)
            </button>
          )}
          <button
            onClick={() => setIsEditingName(true)}
            className="px-4 py-2 bg-white/70 hover:bg-white text-slate-700 font-semibold text-xs rounded-xl border border-white/80 transition shadow-2xs"
          >
            Đổi Tên Hiển Thị (Display Name)
          </button>
        </div>
      </div>

      {/* Modal đổi tên hiển thị với Gemini 2.5 Moderation */}
      {isEditingName && (
        <div className="bg-white/80 backdrop-blur-xl border border-blue-200/80 rounded-2xl p-4 shadow-lg animate-in fade-in duration-200">
          <form onSubmit={handleSaveName} className="space-y-3 max-w-md">
            <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Đổi Tên Hiển Thị & Kiểm Duyệt Tức Thời (Gemini AI)
            </h3>
            <input
              type="text"
              required
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Nhập tên mới..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-white/80 bg-white/70 backdrop-blur-md focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {modError && (
              <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {modError}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isChecking}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                {isChecking ? 'Đang kiểm duyệt...' : 'Lưu Tên'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="px-4 py-1.5 bg-white/60 hover:bg-white text-slate-600 text-xs font-semibold rounded-xl border border-white/70"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Thống kê Trust Score & Lịch sử */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl depth-2">
          <span className="text-xs text-slate-500 font-medium">Điểm Uy Tín (Trust Score)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-emerald-600">{currentUser.trustScore}</span>
            <span className="text-xs text-slate-400">/ 100 điểm</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Dựa trên giao dịch hoàn tất có video đầy đủ và không bị báo cáo.</p>
        </div>

        <div className="glass-card p-5 rounded-2xl depth-2">
          <span className="text-xs text-slate-500 font-medium">Giao Dịch Đã Hoàn Tất</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-blue-600">{myTransactions.length}</span>
            <span className="text-xs text-slate-400">đơn hàng</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Đã nghiệm thu qua video 5 bước trực tiếp.</p>
        </div>

        <div className="glass-card p-5 rounded-2xl depth-2">
          <span className="text-xs text-slate-500 font-medium">Sản Phẩm Đang Đăng Bán</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-indigo-600">{myProducts.length}</span>
            <span className="text-xs text-slate-400">máy tính</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Đã kiểm tra mã Serial Number.</p>
        </div>
      </div>

      {/* Trực quan hóa bảo mật PII & Mã hóa AES-256 đối xứng */}
      <div className="bg-white/75 backdrop-blur-2xl rounded-3xl border border-white/85 p-6 space-y-4 shadow-lg shadow-slate-900/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Hồ Sơ Danh Tính Được <span className="font-extrabold text-indigo-600 text-base">Mã Hoá</span></h3>
              <p className="text-xs text-slate-500">Mọi thông tin nhạy cảm của bạn được bảo mật tuyệt đối trong database</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Không lộ danh tính
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 space-y-1">
            <span className="text-[11px] text-slate-400 font-sans block">Họ Tên Thật (Mã hoá):</span>
            <p className="font-bold text-slate-800 truncate" title={currentUser.encryptedRealName}>
              {currentUser.encryptedRealName}
            </p>
            <span className="text-[10px] text-emerald-600 font-sans flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Ẩn khỏi người mua
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 space-y-1">
            <span className="text-[11px] text-slate-400 font-sans block">Lớp Học (Mã hoá):</span>
            <p className="font-bold text-slate-800 truncate" title={currentUser.encryptedClassName}>
              {currentUser.encryptedClassName}
            </p>
            <span className="text-[10px] text-emerald-600 font-sans flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Ẩn khỏi người mua
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 space-y-1">
            <span className="text-[11px] text-slate-400 font-sans block">Username Hệ Thống (Mã hoá):</span>
            <p className="font-bold text-slate-800 truncate" title={currentUser.encryptedUsername}>
              {currentUser.encryptedUsername}
            </p>
            <span className="text-[10px] text-emerald-600 font-sans flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Không công khai
            </span>
          </div>
        </div>
      </div>

      {/* Quản lý danh sách sản phẩm & tài liệu đăng bán */}
      <div className="bg-white/75 backdrop-blur-2xl rounded-3xl border border-white/85 p-6 space-y-4 shadow-lg shadow-slate-900/5">
        <div className="flex items-center justify-between border-b border-white/60 pb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">Danh Sách Đồ Dùng & Tài Liệu Của Bạn ({myProducts.length})</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Theo dõi tình trạng phê duyệt</span>
        </div>

        {myProducts.length === 0 ? (
          <div className="p-8 text-center bg-white/50 backdrop-blur-sm rounded-2xl border border-white/70 space-y-1">
            <p className="text-xs font-bold text-slate-600">Bạn chưa đăng bài sản phẩm hoặc tài liệu nào</p>
            <p className="text-[11px] text-slate-400">Hãy vào mục "Đăng Bán & Chia Sẻ" để gửi yêu cầu bán máy tính hoặc chia sẻ tài liệu học tập.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myProducts.map(p => {
              const isPending = p.status === 'pending_admin';
              const isApproved = p.status === 'active';
              const isRequiresEdit = p.status === 'requires_edit';
              const isRejected = p.status === 'rejected';
              const isFlagged = p.status === 'flagged';

              return (
                <div key={p.id} className="p-4 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md flex flex-col space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={p.imageUrls[0]} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{p.title}</h4>
                        <p className="text-xs text-blue-600 font-bold">
                          {p.price === 0 ? <span className="text-emerald-600">0 đ (Tặng miễn phí)</span> : `${p.price.toLocaleString('vi-VN')} đ`}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {p.category === 'document' ? `Tài liệu: ${p.subject || ''} ${p.grade || ''}` : `S/N: ${p.serialNumber || 'N/A'}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          Đang Chờ Admin Duyệt
                        </span>
                      )}

                      {isRequiresEdit && (
                        <span className="px-3 py-1.5 rounded-xl bg-orange-50 text-orange-900 border border-orange-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                          <AlertCircle className="w-3.5 h-3.5 text-orange-600 animate-bounce" />
                          Admin Yêu Cầu Sửa / Bổ Sung
                        </span>
                      )}

                      {isApproved && (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đã Duyệt • Đang Trên Sàn
                        </span>
                      )}

                      {isRejected && (
                        <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          Bị Từ Chối (Đã Bỏ)
                        </span>
                      )}

                      {isFlagged && (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                          Đã Bị Admin Gỡ Khỏi Sàn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hiển thị ghi chú của Admin nếu có */}
                  {p.adminNotes && (isRequiresEdit || isRejected || isFlagged) && (
                    <div className={`text-[11px] p-3 rounded-xl border flex items-start gap-2 ${
                      isRequiresEdit ? 'bg-orange-50/80 border-orange-200 text-orange-950' : 'bg-rose-50/70 border-rose-200/70 text-rose-800'
                    }`}>
                      <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isRequiresEdit ? 'text-orange-600' : 'text-rose-600'}`} />
                      <div className="flex-1">
                        <span className="font-bold block">
                          {isRequiresEdit ? 'Admin yêu cầu bổ sung / sửa lại:' : 'Lý do từ Admin:'}
                        </span>
                        <p className="mt-0.5 leading-relaxed font-normal">{p.adminNotes}</p>
                      </div>
                    </div>
                  )}

                  {/* Hàng nút hành động: Sửa bài hoặc Xóa bài đăng */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      Mã bài: #{p.id}
                    </span>

                    <div className="flex items-center gap-2">
                      {(isRequiresEdit || isRejected || isFlagged) && onEditProduct && (
                        <button
                          onClick={() => onEditProduct(p)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {isRequiresEdit ? 'Sửa & Nộp Lại Cho Admin' : 'Chỉnh Sửa & Đăng Lại'}
                        </button>
                      )}

                      {onDeleteProduct && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa bài đăng "${p.title}" không?`)) {
                              onDeleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa bài đăng này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
