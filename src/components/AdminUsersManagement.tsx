import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trash2, 
  Shield, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Lock,
  Sparkles,
  Calendar,
  Mail
} from 'lucide-react';
import { UserProfile } from '../types';
import { fetchProfilesFromSupabase, deleteProfileFromSupabase } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { INITIAL_ROSTER } from '../services/mockData';

export const AdminUsersManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'student'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // 1. Tải từ Supabase
      const dbProfiles = await fetchProfilesFromSupabase();
      
      // 2. Tải từ LocalStorage (lọc bỏ triệt để các tài khoản clone sinh tự động)
      let localProfiles: UserProfile[] = [];
      try {
        const saved = localStorage.getItem('ntsell_user_profiles_list');
        if (saved) {
          localProfiles = (JSON.parse(saved) as UserProfile[]).filter(
            p => !p.id.startsWith('student-hs-') && !p.id.startsWith('mock-')
          );
        }
      } catch {}

      // Chỉ giữ tài khoản Admin duy nhất
      const defaultProfiles: UserProfile[] = [
        {
          id: 'admin_root',
          encryptedRealName: 'Quản Trị Viên',
          encryptedClassName: 'Ban Quản Trị',
          encryptedUsername: 'admin',
          displayName: 'Quản Trị Viên (Admin)',
          email: 'admin@ntsell.edu.vn',
          trustScore: 100,
          completedOrdersCount: 99,
          violationCount: 0,
          role: 'admin',
          status: 'active',
          createdAt: '2026-08-01T08:00:00Z'
        }
      ];

      // Gộp và loại trùng ID
      const map = new Map<string, UserProfile>();
      defaultProfiles.forEach(p => map.set(p.id, p));
      localProfiles.forEach(p => map.set(p.id, p));
      
      // Nạp toàn bộ tài khoản thật từ Supabase
      dbProfiles.forEach(p => {
        map.set(p.id, {
          id: p.id,
          encryptedRealName: p.encrypted_real_name || p.real_name || p.display_name || 'Học Sinh',
          encryptedClassName: p.encrypted_class_name || p.class_name || 'N/A',
          encryptedUsername: p.username || (p.email ? p.email.split('@')[0] : p.id),
          displayName: p.display_name || 'Học Sinh',
          email: p.email || undefined,
          trustScore: p.trust_score ?? 100,
          completedOrdersCount: p.completed_orders_count ?? 0,
          violationCount: p.violation_count ?? 0,
          role: p.role || 'student',
          status: p.status || 'active',
          createdAt: p.created_at || new Date().toISOString()
        });
      });

      // Tự động nhận diện các người bán thật đã đăng sản phẩm (như le_tien_hieu)
      try {
        const { data: prods } = await supabase.from('products').select('seller_id, seller_display_name, created_at');
        (prods || []).forEach((prod: any) => {
          if (prod.seller_id) {
            const rosterId = prod.seller_id.replace('usr_', '');
            const matchedRoster = INITIAL_ROSTER.find(r => r.id === rosterId);
            const existing = map.get(prod.seller_id);
            if (!existing) {
              map.set(prod.seller_id, {
                id: prod.seller_id,
                encryptedRealName: matchedRoster?.realName || prod.seller_display_name,
                encryptedClassName: matchedRoster?.className || '11B11',
                encryptedUsername: prod.seller_display_name,
                displayName: matchedRoster ? `${matchedRoster.realName} (${matchedRoster.className})` : prod.seller_display_name,
                email: `${rosterId}@student.ntsell.edu.vn`,
                trustScore: 100,
                completedOrdersCount: 1,
                violationCount: 0,
                role: 'student',
                status: 'active',
                createdAt: prod.created_at || new Date().toISOString()
              });
            }
          }
        });
      } catch {}

      // Lọc bỏ triệt để mọi tài khoản clone sinh tự động
      const merged = Array.from(map.values()).filter(
        u => !u.id.startsWith('student-hs-') && !u.id.startsWith('mock-')
      );
      setUsers(merged);
      localStorage.setItem('ntsell_user_profiles_list', JSON.stringify(merged));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setIsDeleting(true);
    try {
      const targetId = deleteConfirmUser.id;
      // 1. Xóa trên Supabase
      await deleteProfileFromSupabase(targetId);

      // 2. Cập nhật LocalStorage
      const updated = users.filter(u => u.id !== targetId);
      setUsers(updated);
      localStorage.setItem('ntsell_user_profiles_list', JSON.stringify(updated));

      // 3. Nếu user đang có session thì xóa session
      try {
        const currentActive = localStorage.getItem('ntsell_current_user');
        if (currentActive && JSON.parse(currentActive).id === targetId) {
          localStorage.removeItem('ntsell_current_user');
        }
      } catch {}

      alert(`Đã xóa thành công tài khoản "${deleteConfirmUser.displayName}" khỏi toàn hệ thống!`);
      setDeleteConfirmUser(null);
    } catch (err: any) {
      alert('Lỗi khi xóa tài khoản: ' + err?.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
      {/* Tiêu đề & Công cụ */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Danh Sách & Quản Lý Tài Khoản Trên Web
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị viên có toàn quyền xem thông tin định danh, lịch sử tài khoản và xóa tài khoản vi phạm.
          </p>
        </div>

        <button
          onClick={loadUsers}
          disabled={isLoading}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Đang tải...' : 'Làm Mới'}
        </button>
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hiển thị, email hoặc ID tài khoản..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              roleFilter === 'all' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('student')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              roleFilter === 'student' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Học sinh ({users.filter(u => u.role === 'student').length})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              roleFilter === 'admin' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin ({users.filter(u => u.role === 'admin').length})
          </button>
        </div>
      </div>

      {/* Bảng danh sách tài khoản */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Tài Khoản / Tên</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Vai Trò</th>
              <th className="py-3 px-4">Điểm Uy Tín</th>
              <th className="py-3 px-4">Ngày Tạo</th>
              <th className="py-3 px-4 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Không tìm thấy tài khoản nào khớp với bộ lọc.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                        user.role === 'admin' ? 'bg-indigo-600' : 'bg-blue-600'
                      }`}>
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{user.displayName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {user.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-slate-700 font-mono flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {user.email || 'Chưa liên kết email'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                      user.role === 'admin'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {user.role === 'admin' ? 'Quản Trị' : 'Học Sinh'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {user.trustScore}/100
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setDeleteConfirmUser(user)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 transition"
                      title="Xóa tài khoản này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal xác nhận xóa an toàn */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Tài Khoản</h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl text-xs text-slate-700 space-y-1">
              <p><span className="font-bold">Tài khoản:</span> {deleteConfirmUser.displayName}</p>
              <p><span className="font-bold">Email:</span> {deleteConfirmUser.email || 'Không có'}</p>
              <p><span className="font-bold">Vai trò:</span> {deleteConfirmUser.role === 'admin' ? 'Quản Trị Viên' : 'Học Sinh'}</p>
              <p className="text-rose-700 text-[11px] pt-1">
                ⚠️ Lưu ý: Khi xóa, toàn bộ phiên đăng nhập của người dùng này sẽ bị hủy bỏ và không thể tiếp tục thao tác trên hệ thống.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
