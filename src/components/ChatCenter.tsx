import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  ShieldCheck, 
  Lock, 
  MessageSquare, 
  Calendar,
  Sparkles, 
  ShoppingBag, 
  RefreshCw, 
  ArrowLeft,
  Search,
  CheckCheck,
  Smile
} from 'lucide-react';
import { ChatMessage, Conversation, UserProfile } from '../types';

interface ChatCenterProps {
  conversations: Conversation[];
  messages: ChatMessage[];
  currentUser: UserProfile | null;
  initialConvoId?: string | null;
  onSendMessage: (conversationId: string, text: string) => void;
  onScheduleMeet: (productId: string) => void;
  onRefreshChat?: () => Promise<void> | void;
}

export const ChatCenter: React.FC<ChatCenterProps> = ({
  conversations,
  messages,
  currentUser,
  initialConvoId,
  onSendMessage,
  onScheduleMeet,
  onRefreshChat
}) => {
  const currentUserId = (currentUser?.id || '').trim().toLowerCase();
  const currentUserName = (currentUser?.displayName || '').trim().toLowerCase();
  const isAdmin = currentUser?.role === 'admin';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc cuộc trò chuyện: User thấy hội thoại mình tham gia (so khớp ID hoặc Tên không phân biệt hoa thường), Admin thấy toàn bộ
  const myConversations = conversations.filter(c => {
    if (!currentUser) return false;
    if (isAdmin) return true;
    const bId = (c.buyerId || '').trim().toLowerCase();
    const sId = (c.sellerId || '').trim().toLowerCase();
    const bName = (c.buyerDisplayName || '').trim().toLowerCase();
    const sName = (c.sellerDisplayName || '').trim().toLowerCase();

    return (
      (currentUserId && (bId === currentUserId || sId === currentUserId)) ||
      (currentUserName && (bName === currentUserName || sName === currentUserName))
    );
  });

  // Tìm kiếm trong danh sách hội thoại
  const filteredConversations = myConversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const partnerName = (c.buyerId === currentUser?.id ? c.sellerDisplayName : c.buyerDisplayName) || '';
    return (
      partnerName.toLowerCase().includes(q) ||
      (c.productTitle || '').toLowerCase().includes(q) ||
      (c.lastMessage || '').toLowerCase().includes(q)
    );
  });

  // Quản lý hội thoại đang mở (Mobile: null = hiển thị danh sách, có ID = mở khung chat)
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(() => {
    if (initialConvoId && myConversations.some(c => c.id === initialConvoId)) {
      return initialConvoId;
    }
    // Trên điện thoại (<768px): ưu tiên hiển thị Hộp thư đối tác trước
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return null;
    }
    return myConversations.length > 0 ? myConversations[0].id : null;
  });

  // Đồng bộ initialConvoId khi mở từ trang chi tiết sản phẩm
  useEffect(() => {
    if (initialConvoId && myConversations.some(c => c.id === initialConvoId)) {
      setSelectedConvoId(initialConvoId);
    }
  }, [initialConvoId]);

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeConvo = myConversations.find(c => c.id === selectedConvoId) || null;
  const activeMessages = selectedConvoId 
    ? messages.filter(m => m.conversationId === selectedConvoId) 
    : [];

  // Tự cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeMessages.length, selectedConvoId]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if (!text || !activeConvo) return;
    onSendMessage(activeConvo.id, text);
    if (textToSend === undefined) {
      setInputMessage('');
    }
  };

  const getPartnerDisplayName = (convo: Conversation) => {
    const isBuyer = (convo.buyerId && convo.buyerId.toLowerCase() === currentUserId) || 
                    (convo.buyerDisplayName && convo.buyerDisplayName.toLowerCase() === currentUserName);
    return isBuyer ? convo.sellerDisplayName : convo.buyerDisplayName;
  };

  const quickReplies = [
    'Máy tính còn không bạn ơi?',
    'Có fix giá thêm chút không ạ?',
    'Hẹn ra chơi gặp test máy nhé!',
    'Máy có kèm nắp bảo vệ và pin không bạn?'
  ];

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-2 sm:py-6">
      {/* Tiêu đề & Giới thiệu tính năng */}
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
              <MessageSquare className="w-4 h-4" />
            </div>
            Tin Nhắn Messenger Học Đường
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Biên bản thương lượng được mã hoá PII & lưu trữ đối soát tự động 24/7.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshChat && (
            <button
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await onRefreshChat();
                } finally {
                  setTimeout(() => setIsRefreshing(false), 500);
                }
              }}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Đồng bộ lại toàn bộ tin nhắn từ hệ thống"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Đang tải...' : 'Làm mới'}
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Chống Sửa/Xóa Tin</span>
          </div>
        </div>
      </div>

      {/* Khung Giao Diện Kiểu Messenger: 2 Cột Trên PC - Mở Đầy Đủ Trên Điện Thoại */}
      <div className="bg-white/75 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/85 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100dvh-175px)] sm:h-[650px] md:h-[680px]">
        
        {/* =================================================================== */}
        {/* CỘT DANH SÁCH CUỘC TRÒ CHUYỆN (HỘP THƯ ĐỐI TÁC GIỐNG ẢNH MẪU) */}
        {/* =================================================================== */}
        <div className={`md:col-span-5 lg:col-span-4 border-r border-white/60 bg-white/40 backdrop-blur-xl flex flex-col h-full overflow-hidden ${
          selectedConvoId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header Hộp thư đối tác */}
          <div className="p-4 border-b border-white/60 bg-white/60 backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Hộp Thư Đối Tác
              </span>
              <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200/60 px-2.5 py-0.5 rounded-full font-extrabold shadow-2xs">
                {myConversations.length} HỘI THOẠI
              </span>
            </div>

            {/* Thanh tìm kiếm nhanh bạn bè */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm bạn học, máy tính..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Danh sách các thẻ hội thoại (Messenger Cards) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2.5">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <p className="text-xs font-bold text-slate-700">Chưa có cuộc trò chuyện nào</p>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                  Bấm nút <b>"Nhắn Tin Thương Lượng"</b> ở một máy tính bất kỳ để kết nối với người bán.
                </p>
              </div>
            ) : (
              filteredConversations.map(convo => {
                const isSelected = convo.id === selectedConvoId;
                const partnerName = getPartnerDisplayName(convo);
                const firstLetter = (partnerName || '?').charAt(0).toUpperCase();

                return (
                  <div
                    key={convo.id}
                    onClick={() => setSelectedConvoId(convo.id)}
                    className={`p-3.5 rounded-[20px] transition-all duration-150 cursor-pointer flex items-center gap-3.5 border ${
                      isSelected 
                        ? 'bg-blue-50/50 border-2 border-blue-500 shadow-sm' 
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                    }`}
                  >
                    {/* Avatar Squircle Bo Tròn Kiểu Messenger */}
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 rounded-[18px] flex items-center justify-center font-black text-base text-white shadow-xs transition-colors ${
                        isSelected 
                          ? 'bg-blue-600 ring-2 ring-blue-300/60' 
                          : 'bg-slate-600'
                      }`}>
                        {firstLetter}
                      </div>
                      {/* Chấm tròn xanh online */}
                      <span className="w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full absolute -bottom-0.5 -right-0.5 shadow-xs" />
                    </div>

                    {/* Nội dung tin nhắn & thông tin đối tác */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className={`text-sm font-bold truncate ${
                          isSelected ? 'text-blue-900 font-extrabold' : 'text-slate-900'
                        }`}>
                          {partnerName}
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                          {new Date(convo.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className={`text-xs truncate mt-0.5 ${
                        isSelected ? 'text-blue-800/80 font-medium' : 'text-slate-500'
                      }`}>
                        {convo.lastMessage || 'Đã bắt đầu cuộc trò chuyện'}
                      </p>

                      {/* Huy hiệu máy tính đang trao đổi */}
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-indigo-600 font-semibold truncate">
                        <ShoppingBag className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                        <span className="truncate">{convo.productTitle}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* CỘT CHI TIẾT ĐOẠN CHAT (MESSENGER CHAT ROOM) */}
        {/* =================================================================== */}
        <div className={`md:col-span-7 lg:col-span-8 flex flex-col h-full overflow-hidden bg-white ${
          !selectedConvoId ? 'hidden md:flex' : 'flex'
        }`}>
          {activeConvo ? (
            <>
              {/* Header Khung Chat Messenger */}
              <div className="p-3.5 sm:p-4 border-b border-white/60 bg-white/65 backdrop-blur-md flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Nút quay lại danh sách trên mobile */}
                  <button
                    onClick={() => setSelectedConvoId(null)}
                    className="md:hidden p-2 -ml-1 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
                    title="Quay lại danh sách tin nhắn"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-[16px] bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black flex items-center justify-center shadow-xs text-sm">
                      {getPartnerDisplayName(activeConvo).charAt(0).toUpperCase()}
                    </div>
                    <span className="w-3 h-3 bg-emerald-500 border-2 border-white rounded-full absolute -bottom-0.5 -right-0.5 shadow-xs" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-sm truncate leading-tight">
                      {getPartnerDisplayName(activeConvo)}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      <span>Đang hoạt động • Học sinh uy tín</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onScheduleMeet(activeConvo.productId)}
                  className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-500/20 flex items-center gap-1.5 shrink-0"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">Hẹn Gặp Trực Tiếp</span>
                  <span className="xs:hidden sm:hidden">Hẹn Gặp</span>
                </button>
              </div>

              {/* Banner Máy Tính Đang Thương Lượng (Ghim Ở Đầu Tin Nhắn) */}
              <div className="px-4 py-2 bg-white/40 backdrop-blur-sm border-b border-white/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 truncate">
                  {activeConvo.productImage ? (
                    <img 
                      src={activeConvo.productImage} 
                      alt="" 
                      className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  )}
                  <div className="truncate">
                    <span className="text-slate-500 text-[10px] block">Đang thương lượng về máy:</span>
                    <span className="text-slate-900 font-bold truncate block">{activeConvo.productTitle}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className="font-extrabold text-blue-600 text-sm block">
                    {activeConvo.productPrice.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Luồng Tin Nhắn Kiểu Bong Bóng Messenger */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/40">
                <div className="text-center my-1">
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-200/70 px-3 py-1 rounded-full font-medium">
                    <Lock className="w-3 h-3 text-indigo-600" /> Biên bản chat được ghi nhận an toàn và không thể thu hồi
                  </span>
                </div>

                {activeMessages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">Bắt đầu cuộc trò chuyện với {getPartnerDisplayName(activeConvo)}</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Gửi lời chào hoặc chọn câu hỏi mẫu bên dưới để hỏi về tình trạng máy tính và hẹn gặp!
                    </p>
                  </div>
                ) : (
                  activeMessages.map(msg => {
                    const isMine = (msg.senderId && msg.senderId.toLowerCase() === currentUserId) || 
                                   (currentUser?.displayName && msg.senderDisplayName?.toLowerCase().trim() === currentUserName);

                    return (
                      <div 
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end ml-auto' : 'items-start'} max-w-[82%] sm:max-w-[72%]`}
                      >
                        {!isMine && (
                          <span className="text-[10px] font-bold text-slate-500 mb-0.5 px-2">
                            {msg.senderDisplayName}
                          </span>
                        )}

                        <div className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs break-words ${
                          isMine 
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-md shadow-blue-600/20' 
                            : 'bg-white/85 backdrop-blur-md border border-white/90 text-slate-800 rounded-bl-xs shadow-xs'
                        }`}>
                          {msg.messageText}
                        </div>

                        <span className="text-[10px] text-slate-400 mt-0.5 px-1.5 flex items-center gap-1">
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          {isMine && <CheckCheck className="w-3 h-3 text-blue-500" />}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Gợi Ý Câu Hỏi Nhanh (Quick Action Chips) */}
              <div className="px-3 py-1.5 bg-white/50 backdrop-blur-md border-t border-white/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {quickReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(reply)}
                    className="whitespace-nowrap px-3 py-1 rounded-full bg-white/70 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[11px] font-semibold border border-white/80 transition shrink-0 shadow-2xs"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              {/* Thanh Nhập Tin Nhắn Bo Tròn Viên Thuốc Chuẩn Messenger */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }} 
                className="p-2.5 sm:p-3 border-t border-white/60 bg-white/65 backdrop-blur-md flex items-center gap-2"
              >
                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    placeholder="Nhập tin nhắn..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm bg-white/60 backdrop-blur-sm border border-white/70 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/95 transition"
                  />
                  <span className="absolute right-3 text-slate-400 pointer-events-none">
                    <Smile className="w-4 h-4" />
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition shadow-md shadow-blue-500/30 shrink-0 cursor-pointer"
                  title="Gửi tin nhắn"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </>
          ) : (
            /* Trạng Thái Trống Khi Chưa Chọn Hội Thoại Nào Trên Màn Hình Lớn */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base">Chọn một cuộc trò chuyện để xem tin nhắn</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Bấm vào một người bạn ở cột bên trái để tiếp tục thương lượng hoặc giải đáp thắc mắc về máy tính Casio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


