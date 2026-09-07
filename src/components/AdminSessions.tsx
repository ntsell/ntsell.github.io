// ====================================================================
// ADMIN SESSIONS MANAGEMENT VIEW (BƯỚC 7)
// Quản lý & giám sát toàn bộ sessions học sinh & admin
// ====================================================================

import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Smartphone, 
  ShieldCheck, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  Users,
  HardDrive
} from 'lucide-react';
import { UserSession } from '../types';
import { fetchAllSessionsAdmin, revokeSessionByAdmin } from '../services/sessionService';
import { supabase } from '../services/supabaseClient';

export const AdminSessions: React.FC = () => {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllSessionsAdmin();
      setSessions(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // Subscribe Realtime trên user_sessions
    const channel = supabase.channel('admin_user_sessions_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions' }, () => {
        loadSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRevoke = async (sessionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn ngắt kết nối session này từ xa?')) return;
    setActionLoadingId(sessionId);
    try {
      await revokeSessionByAdmin(sessionId);
      await loadSessions();
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = 
      (s.userDisplayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.deviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.ipAddress || '').includes(searchTerm) ||
      s.deviceFingerprint.includes(searchTerm);

    if (statusFilter === 'active') return matchesSearch && s.isActive;
    if (statusFilter === 'inactive') return matchesSearch && !s.isActive;
    return matchesSearch;
  });

  const activeCount = sessions.filter(s => s.isActive).length;
  const uniqueUsers = new Set(sessions.map(s => s.userId)).size;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Thống kê Sessions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Phiên đang hoạt động</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" /> Online Realtime
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Người dùng đã đăng nhập</span>
          <p className="text-2xl font-black text-blue-600 mt-1">{uniqueUsers}</p>
          <span className="text-[11px] text-slate-500">Mỗi user 1 thiết bị</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Tổng số phiên ghi nhận</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">{sessions.length}</p>
          <span className="text-[11px] text-indigo-600 font-medium">FingerprintJS 99%</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Bảo mật thiết bị</span>
          <p className="text-2xl font-black text-slate-900 mt-1">Single</p>
          <span className="text-[11px] text-emerald-600 font-bold">Auto-revoke thiết bị lạ</span>
        </div>
      </div>

      {/* Thanh công cụ tìm kiếm & lọc */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Tên học sinh, Thiết bị, IP, Fingerprint..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang kết nối (Active)</option>
            <option value="inactive">Đã ngắt (Revoked)</option>
          </select>

          <button
            onClick={loadSessions}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Danh sách Sessions */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Người dùng</th>
                <th className="py-3.5 px-4">Thiết bị & Hệ điều hành</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Device Fingerprint</th>
                <th className="py-3.5 px-4">Hoạt động gần nhất</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <HardDrive className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Không tìm thấy phiên đăng nhập nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredSessions.map(s => {
                  const isMobile = s.deviceName.includes('Điện thoại') || s.deviceName.includes('Mobile');
                  const Icon = isMobile ? Smartphone : Laptop;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center">
                            {(s.userDisplayName || 'H').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{s.userDisplayName || 'Học sinh'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{s.userId.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Icon className="w-4 h-4 text-slate-500" />
                          <span>{s.deviceName}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {s.ipAddress || '127.0.0.1'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {s.deviceFingerprint.slice(0, 12)}...
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(s.lastActivity).toLocaleTimeString('vi-VN')} • {new Date(s.lastActivity).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {s.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Đang kết nối
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                            <XCircle className="w-3 h-3 text-slate-400" />
                            Đã thu hồi
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {s.isActive ? (
                          <button
                            onClick={() => handleRevoke(s.id)}
                            disabled={actionLoadingId === s.id}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200 transition cursor-pointer disabled:opacity-50 flex items-center gap-1 ml-auto"
                          >
                            <LogOut className="w-3 h-3" />
                            {actionLoadingId === s.id ? 'Đang ngắt...' : 'Ngắt kết nối'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Không khả dụng</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
