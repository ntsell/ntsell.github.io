import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  ShieldCheck, 
  Lock, 
  MessageSquare, 
  Calendar,
  Clock,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { ChatMessage, Conversation, UserProfile } from '../types';

interface ChatCenterProps {
  conversations: Conversation[];
  messages: ChatMessage[];
  currentUser: UserProfile | null;
  onSendMessage: (conversationId: string, text: string) => void;
  onScheduleMeet: (productId: string) => void;
  onRefreshChat?: () => Promise<void> | void;
}

export const ChatCenter: React.FC<ChatCenterProps> = ({
  conversations,
  messages,
  currentUser,
  onSendMessage,
  onScheduleMeet,
  onRefreshChat
}) => {
  const currentUserId = currentUser?.id || '';
  const isAdmin = currentUser?.role === 'admin';
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Lọc cuộc trò chuyện: User thấy hội thoại mình tham gia (theo id hoặc displayName), Admin thấy toàn bộ hội thoại để giám sát phòng chống lừa đảo
  const myConversations = conversations.filter(c => {
    if (!currentUserId) return false;
    if (isAdmin) return true; // Admin được xem tất cả để can thiệp tranh chấp và kiểm duyệt
    return c.buyerId === currentUserId || 
           c.sellerId === currentUserId || 
           (currentUser?.displayName && (c.buyerDisplayName === currentUser.displayName || c.sellerDisplayName === currentUser.displayName));
  });

  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(() => {
    return myConversations.length > 0 ? myConversations[0].id : null;
  });

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Tự động chọn cuộc trò chuyện đầu tiên nếu chưa chọn hoặc danh sách thay đổi
  useEffect(() => {
    if (myConversations.length > 0) {
      if (!selectedConvoId || !myConversations.some(c => c.id === selectedConvoId)) {
        setSelectedConvoId(myConversations[0].id);
      }
    } else {
      setSelectedConvoId(null);
    }
  }, [myConversations, selectedConvoId]);

  const activeConvo = myConversations.find(c => c.id === selectedConvoId) || null;
  const activeMessages = selectedConvoId 
    ? messages.filter(m => m.conversationId === selectedConvoId) 
    : [];

  // Tự cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConvo) return;
    onSendMessage(activeConvo.id, inputMessage.trim());
    setInputMessage('');
  };

  // Xác định người chat đối tác (Buyer hay Seller)
  const getPartnerDisplayName = (convo: Conversation) => {
    return convo.buyerId === currentUserId ? convo.sellerDisplayName : convo.buyerDisplayName;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Tiêu đề & Giới thiệu tính năng */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-blue-600" />
            Kênh Chat & Biên Bản Thương Lượng Trực Tuyến
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống tự động lưu vết biên bản chat chống gian lận. <b>Không cho phép xóa/sửa tin nhắn</b> để bảo vệ hai bên khi giải quyết tranh chấp.
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              title="Đồng bộ lại toàn bộ tin nhắn từ Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Đang tải...' : 'Làm mới tin nhắn'}
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 self-start sm:self-center">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            Mã hoá PII & Lưu vết SLA
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[580px]">
        {/* Cột 1: Danh sách các cuộc trò chuyện thực tế */}
        <div className="border-r border-slate-200 bg-slate-50/70 flex flex-col h-[580px]">
          <div className="p-4 border-b border-slate-200 bg-white/80">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Hộp Thư Đối Tác</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                {myConversations.length} hội thoại
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {myConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-300">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-600">Chưa có cuộc trò chuyện nào</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Bấm nút <b>"Nhắn Tin Thương Lượng"</b> ở chi tiết một máy tính trên sàn để bắt đầu trò chuyện với người bán.
                </p>
              </div>
            ) : (
              myConversations.map(convo => {
                const isSelected = convo.id === selectedConvoId;
                const partnerName = getPartnerDisplayName(convo);
                return (
                  <div
                    key={convo.id}
                    onClick={() => setSelectedConvoId(convo.id)}
                    className={`p-3.5 rounded-2xl transition duration-150 cursor-pointer flex items-center gap-3 border ${
                      isSelected 
                        ? 'bg-blue-50/80 border-blue-400 shadow-xs' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-xs ${
                      isSelected ? 'bg-blue-600' : 'bg-slate-500'
                    }`}>
                      {partnerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {partnerName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(convo.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {convo.lastMessage || convo.productTitle}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-indigo-600 font-semibold truncate">
                        <ShoppingBag className="w-3 h-3 shrink-0" />
                        <span className="truncate">{convo.productTitle}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Cột 2: Khung chat chi tiết */}
        <div className="md:col-span-2 flex flex-col h-[580px] bg-white">
          {activeConvo ? (
            <>
              {/* Header hội thoại */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center shadow-xs">
                    {getPartnerDisplayName(activeConvo).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {getPartnerDisplayName(activeConvo)}
                    </h3>
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Học Sinh Đã Xác Thực
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onScheduleMeet(activeConvo.productId)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-600/20 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Hẹn Gặp Trực Tiếp
                </button>
              </div>

              {/* Banner sản phẩm đang thương lượng */}
              <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <img 
                    src={activeConvo.productImage} 
                    alt="" 
                    className="w-8 h-8 rounded-lg object-cover border border-blue-200 shrink-0" 
                  />
                  <span className="text-slate-700 truncate">
                    Máy đang trao đổi: <b className="text-slate-900">{activeConvo.productTitle}</b>
                  </span>
                </div>
                <span className="font-extrabold text-blue-700 shrink-0 ml-3">
                  {activeConvo.productPrice.toLocaleString('vi-VN')} đ
                </span>
              </div>

              {/* Danh sách tin nhắn */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
                <div className="text-center my-2">
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    <Lock className="w-3 h-3 text-indigo-500" /> Biên bản chat được ghi nhận an toàn & không thể xóa/sửa
                  </span>
                </div>

                {activeMessages.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-blue-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Chưa có tin nhắn nào trong hội thoại này</p>
                    <p className="text-[11px] text-slate-400">
                      Gửi tin nhắn đầu tiên để chào bạn và hẹn giờ ra chơi hoặc thỏa thuận giá máy nhé!
                    </p>
                  </div>
                ) : (
                  activeMessages.map(msg => {
                    const isMine = msg.senderId === currentUserId || (currentUser?.displayName && msg.senderDisplayName === currentUser.displayName);
                    return (
                      <div 
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end ml-auto' : 'items-start'} max-w-[80%]`}
                      >
                        <span className="text-[10px] text-slate-400 mb-0.5 px-2">
                          {isMine ? 'Bạn' : msg.senderDisplayName} • {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs break-words ${
                          isMine 
                            ? 'bg-blue-600 text-white rounded-tr-xs' 
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                        }`}>
                          {msg.messageText}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Ô nhập tin nhắn */}
              <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn thương lượng giá hoặc hẹn điểm gặp tại trường..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1"
                >
                  <Send className="w-4 h-4" />
                  Gửi
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base">Chọn một cuộc trò chuyện</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Chọn người bán ở danh sách bên trái hoặc bấm "Nhắn Tin Thương Lượng" trên bất kỳ máy tính nào ở Chợ Máy Tính để bắt đầu.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

