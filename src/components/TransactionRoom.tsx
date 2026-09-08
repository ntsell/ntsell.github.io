import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Video, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Upload, 
  FileText, 
  ChevronRight,
  ExternalLink,
  Lock,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { Transaction, Dispute } from '../types';
import confetti from 'canvas-confetti';

interface TransactionRoomProps {
  transactions: Transaction[];
  onUploadProof: (transactionId: string, role: 'buyer' | 'seller', videoUrl: string) => void;
  onOpenChat: (productId: string) => void;
  onFileDispute: (transactionId: string, reason: any, details: string) => void;
}

export const TransactionRoom: React.FC<TransactionRoomProps> = ({
  transactions,
  onUploadProof,
  onOpenChat,
  onFileDispute
}) => {
  const [selectedTxId, setSelectedTxId] = useState<string | null>(transactions[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'proofs' | 'dispute'>('proofs');

  React.useEffect(() => {
    if (transactions.length > 0) {
      if (!selectedTxId || !transactions.some(t => t.id === selectedTxId)) {
        setSelectedTxId(transactions[0].id);
      }
    } else {
      setSelectedTxId(null);
    }
  }, [transactions, selectedTxId]);

  const selectedTx = transactions.find(t => t.id === selectedTxId) || null;
  
  // Dispute form states
  const [disputeReason, setDisputeReason] = useState<'item_not_as_described' | 'item_broken_faulty' | 'no_delivery_no_show' | 'other'>('item_not_as_described');
  const [disputeDetails, setDisputeDetails] = useState('');

  if (!selectedTx) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg">Chưa có giao dịch nào</h3>
        <p className="text-xs text-slate-500 mt-1">Khi bạn nhắn tin và tạo lịch hẹn gặp offline, phòng giao dịch sẽ xuất hiện tại đây.</p>
      </div>
    );
  }

  const handleSimulateSellerUpload = () => {
    onUploadProof(
      selectedTx.id, 
      'seller', 
      'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4'
    );
    alert('Đã tải lên Video bằng chứng giao dịch (Seller)! Chờ đối tác Buyer xác nhận.');
  };

  const handleSimulateBuyerConfirm = () => {
    onUploadProof(
      selectedTx.id, 
      'buyer', 
      'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4'
    );
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleSendDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeDetails.trim()) return;
    onFileDispute(selectedTx.id, disputeReason, disputeDetails);
    alert('Đã gửi báo cáo tranh chấp tới Admin! Admin sẽ xem xét lại Video 5 bước và tin nhắn trong 7 ngày.');
    setActiveTab('proofs');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-indigo-600" />
          Phòng Giao Dịch & Đối Soát Bằng Chứng Video
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Nơi lưu trữ bằng chứng video 5 bước, xác nhận bàn giao tiền - máy tính và phân xử khiếu nại minh bạch.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Danh sách giao dịch */}
        <div className={`space-y-3 ${selectedTxId ? 'hidden lg:block' : 'block'}`}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Giao Dịch Của Bạn ({transactions.length})
          </h2>
          {transactions.map(tx => (
            <div
              key={tx.id}
              onClick={() => setSelectedTxId(tx.id)}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                selectedTx.id === tx.id 
                  ? 'bg-blue-50/80 border-blue-500 shadow-sm' 
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800 line-clamp-1">{tx.productTitle}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  tx.status === 'completed' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : tx.status === 'disputed' 
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {tx.status === 'completed' ? 'Hoàn tất' : tx.status === 'disputed' ? 'Tranh chấp' : 'Chờ bằng chứng'}
                </span>
              </div>
              <p className="text-xs font-semibold text-blue-600 mb-2">
                {tx.agreedPrice.toLocaleString('vi-VN')} đ
              </p>
              <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200/60 pt-2">
                <span>Đối tác: <b>{tx.sellerDisplayName}</b></span>
                <span className="text-[10px]">{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Cột phải: Chi tiết giao dịch & Bằng chứng video */}
        <div className={`lg:col-span-2 space-y-4 ${!selectedTxId ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header chi tiết */}
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setSelectedTxId(null)}
                  className="lg:hidden p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 shrink-0"
                  title="Danh sách giao dịch"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] uppercase font-bold text-indigo-600 tracking-wider">Mã GD #{selectedTx.id}</span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{selectedTx.productTitle}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenChat(selectedTx.productId)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-2xs shrink-0"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Xem Biên Bản Chat
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200 px-5 text-xs font-bold">
              <button
                onClick={() => setActiveTab('proofs')}
                className={`py-3 px-2 border-b-2 flex items-center gap-1.5 transition ${
                  activeTab === 'proofs' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Video className="w-4 h-4" />
                Bằng Chứng Video 5 Bước
              </button>
              <button
                onClick={() => setActiveTab('dispute')}
                className={`py-3 px-2 border-b-2 flex items-center gap-1.5 transition ${
                  activeTab === 'dispute' 
                    ? 'border-rose-600 text-rose-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Báo Cáo Sự Cố / Khiếu Nại
              </button>
            </div>

            <div className="p-5">
              {activeTab === 'proofs' ? (
                <div className="space-y-6">
                  {/* Trạng thái SLA */}
                  <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-950 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Quy Chuẩn SLA Xác Nhận 5 Ngày</p>
                      <p className="text-indigo-800 mt-0.5 leading-relaxed">
                        Sau khi người bán tải video đối soát, người mua có 5 ngày để kiểm tra & ấn nút "Xác nhận nhận hàng". Quá 5 ngày, giao dịch sẽ tự động chốt hoàn tất để bảo vệ quyền lợi người bán.
                      </p>
                    </div>
                  </div>

                  {/* 2 Khung video bằng chứng */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Bằng chứng Seller */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-blue-600" />
                          Video Từ Người Bán
                        </span>
                        {selectedTx.sellerProofVideoUrl ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Đã Tải Lên
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded-full">
                            Chờ Tải Lên
                          </span>
                        )}
                      </div>

                      {selectedTx.sellerProofVideoUrl ? (
                        <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center relative">
                          <video 
                            src={selectedTx.sellerProofVideoUrl} 
                            controls 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      ) : (
                        <button
                          onClick={handleSimulateSellerUpload}
                          className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:bg-white transition text-slate-600"
                        >
                          <Upload className="w-6 h-6 text-blue-600 mb-1" />
                          <span className="text-xs font-semibold">Tải Lên Video 5 Bước</span>
                          <span className="text-[10px] text-slate-400">Lưu trữ đám mây bảo mật</span>
                        </button>
                      )}
                    </div>

                    {/* Bằng chứng Buyer */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Xác Nhận Của Người Mua
                        </span>
                        {selectedTx.status === 'completed' ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            Đã Nhận & Hài Lòng
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                            Đang Chờ
                          </span>
                        )}
                      </div>

                      {selectedTx.status === 'completed' ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2 text-center py-6">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                          <p className="font-bold">Giao dịch đã kết thúc thành công!</p>
                          <p className="text-[11px] text-emerald-700">Máy tính đã đổi chủ, điểm uy tín Trust Score đã được cộng thêm cho cả 2 bạn.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-2">
                          <p className="text-xs text-slate-600">
                            Bạn đã gặp trực tiếp, bấm thử phím, màn hình và thanh toán xong?
                          </p>
                          <button
                            onClick={handleSimulateBuyerConfirm}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Xác Nhận Đã Nhận Máy Đúng Mô Tả
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cảnh báo xóa video sau 6 tháng */}
                  <div className="text-[11px] text-slate-500 bg-slate-100/80 p-3 rounded-xl flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Chính sách bảo mật: Video giao dịch sẽ tự động xóa sau 6 tháng nếu không phát sinh tranh chấp.</span>
                  </div>
                </div>
              ) : (
                /* Tab Báo cáo sự cố */
                <form onSubmit={handleSendDispute} className="space-y-4 max-w-lg">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>
                      Khi bạn khiếu nại, giao dịch sẽ được tạm đóng băng và Admin sẽ can thiệp thẩm định trực tiếp qua <b>Video 5 bước</b> và nhật ký đoạn chat.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lý Do Báo Cáo *
                    </label>
                    <select
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="item_not_as_described">Hàng không đúng như mô tả / xước màn hình</option>
                      <option value="item_broken_faulty">Máy bị hỏng phím / liệt phím khi về nhà test</option>
                      <option value="no_delivery_no_show">Đối tác không đến điểm hẹn</option>
                      <option value="fraud_counterfeit">Nghi ngờ máy Casio giả / tem nhái</option>
                      <option value="other">Lý do khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mô Tả Chi Tiết Vấn Đề *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={disputeDetails}
                      onChange={(e) => setDisputeDetails(e.target.value)}
                      placeholder="Nêu rõ mốc thời gian trong video hoặc lý do cụ thể..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Gửi Khiếu Nại Cho Admin Giải Quyết (SLA 7 Ngày)
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
