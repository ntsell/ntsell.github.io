import React, { useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { MarketplaceHome } from './components/MarketplaceHome';
import { ProductDetail } from './components/ProductDetail';
import { CreatePost } from './components/CreatePost';
import { TransactionRoom } from './components/TransactionRoom';
import { ChatCenter } from './components/ChatCenter';
import { VideoProtocolGuide } from './components/VideoProtocolGuide';
import { WikiTerms } from './components/WikiTerms';
import { UserDashboard } from './components/UserDashboard';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';

import { 
  INITIAL_ROSTER, 
  INITIAL_PRODUCTS, 
  INITIAL_TRANSACTIONS, 
  CURRENT_USER_MOCK 
} from './services/mockData';
import { Product, Transaction, Dispute, ChatMessage, Conversation, UserProfile, AppNotification } from './types';
import { 
  fetchProductsFromSupabase, 
  insertProductToSupabase, 
  updateProductStatusInSupabase, 
  deleteProductFromSupabase,
  fetchConversationsFromSupabase,
  upsertConversationToSupabase,
  fetchMessagesFromSupabase,
  insertMessageToSupabase,
  fetchNotificationsFromSupabase,
  insertNotificationToSupabase
} from './services/supabaseService';
import { supabase } from './services/supabaseClient';

export function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Data states (Lưu trữ vào localStorage để đồng bộ giữa các tab/cửa sổ)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('ntsell_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('ntsell_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('ntsell_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('ntsell_conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ntsell_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('ntsell_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Hàm tạo và gửi thông báo mới với realtime BroadcastChannel + sync server
  const sendNotification = (newNotif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const notif: AppNotification = {
      ...newNotif,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      isRead: false,
      createdAt: new Date().toISOString()
    };

    setNotifications(prev => {
      const updated = [notif, ...prev];
      try {
        localStorage.setItem('ntsell_notifications', JSON.stringify(updated));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('ntsell_channel');
          bc.postMessage({ type: 'NOTIFICATIONS_UPDATED', payload: updated });
          bc.close();
        }
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).catch(() => {});
      } catch (err) {
        console.error('Lỗi lưu thông báo:', err);
      }
      return updated;
    });
  };

  const handleMarkNotificationAsRead = (notifId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === notifId ? { ...n, isRead: true } : n);
      try {
        localStorage.setItem('ntsell_notifications', JSON.stringify(updated));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('ntsell_channel');
          bc.postMessage({ type: 'NOTIFICATIONS_UPDATED', payload: updated });
          bc.close();
        }
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).catch(() => {});
      } catch {}
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    if (!currentUser) return;
    setNotifications(prev => {
      // Chỉ xóa các thông báo thuộc về user hiện tại
      const updated = prev.filter(n => n.userId !== currentUser.id && n.userId !== (currentUser.role === 'admin' ? 'admin' : ''));
      try {
        localStorage.setItem('ntsell_notifications', JSON.stringify(updated));
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('ntsell_channel');
          bc.postMessage({ type: 'NOTIFICATIONS_UPDATED', payload: updated });
          bc.close();
        }
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        }).catch(() => {});
      } catch {}
      return updated;
    });
  };

  // Tải ban đầu từ Supabase Database (Đồng bộ trực tuyến giữa mọi thiết bị)
  React.useEffect(() => {
    // 1. Tải danh sách sản phẩm từ Supabase
    fetchProductsFromSupabase().then(dbProds => {
      if (Array.isArray(dbProds) && dbProds.length > 0) {
        setProducts(dbProds);
        localStorage.setItem('ntsell_products', JSON.stringify(dbProds));
      }
    });

    // 2. Tải tin nhắn và cuộc trò chuyện
    fetchConversationsFromSupabase().then(dbConvs => {
      if (Array.isArray(dbConvs) && dbConvs.length > 0) {
        setConversations(dbConvs);
        localStorage.setItem('ntsell_conversations', JSON.stringify(dbConvs));
      }
    });

    fetchMessagesFromSupabase().then(dbMsgs => {
      if (Array.isArray(dbMsgs) && dbMsgs.length > 0) {
        setMessages(dbMsgs);
        localStorage.setItem('ntsell_messages', JSON.stringify(dbMsgs));
      }
    });

    // 3. Tải thông báo nếu đã đăng nhập
    if (currentUser?.id) {
      fetchNotificationsFromSupabase(currentUser.id).then(dbNotifs => {
        if (Array.isArray(dbNotifs) && dbNotifs.length > 0) {
          setNotifications(dbNotifs);
          localStorage.setItem('ntsell_notifications', JSON.stringify(dbNotifs));
        }
      });
    }
  }, [currentUser?.id]);

  // Lắng nghe sự kiện đồng bộ giữa các cửa sổ / tab duyệt web
  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ntsell_products' && e.newValue) {
        try { setProducts(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'ntsell_transactions' && e.newValue) {
        try { setTransactions(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'ntsell_conversations' && e.newValue) {
        try { setConversations(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'ntsell_messages' && e.newValue) {
        try { setMessages(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === 'ntsell_notifications' && e.newValue) {
        try { setNotifications(JSON.parse(e.newValue)); } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Kênh phát sóng BroadcastChannel để đồng bộ tức thì
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('ntsell_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'PRODUCTS_UPDATED') {
          setProducts(event.data.payload);
        }
        if (event.data?.type === 'TRANSACTIONS_UPDATED') {
          setTransactions(event.data.payload);
        }
        if (event.data?.type === 'CONVERSATIONS_UPDATED') {
          setConversations(event.data.payload);
        }
        if (event.data?.type === 'MESSAGES_UPDATED') {
          setMessages(event.data.payload);
        }
        if (event.data?.type === 'NOTIFICATIONS_UPDATED') {
          setNotifications(event.data.payload);
        }
      };
    }

    // Lắng nghe trực tiếp từ Supabase Realtime (Cập nhật tức thì 0 giây giữa mọi thiết bị)
    const realtimeChannel = supabase.channel('ntsell_realtime_db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        const freshProds = await fetchProductsFromSupabase();
        if (Array.isArray(freshProds)) {
          setProducts(freshProds);
          localStorage.setItem('ntsell_products', JSON.stringify(freshProds));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
        const freshMsgs = await fetchMessagesFromSupabase();
        if (Array.isArray(freshMsgs)) {
          setMessages(freshMsgs);
          localStorage.setItem('ntsell_messages', JSON.stringify(freshMsgs));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async () => {
        const freshConvs = await fetchConversationsFromSupabase();
        if (Array.isArray(freshConvs)) {
          setConversations(freshConvs);
          localStorage.setItem('ntsell_conversations', JSON.stringify(freshConvs));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, async () => {
        if (currentUser?.id) {
          const freshNotifs = await fetchNotificationsFromSupabase(currentUser.id);
          if (Array.isArray(freshNotifs)) {
            setNotifications(freshNotifs);
            localStorage.setItem('ntsell_notifications', JSON.stringify(freshNotifs));
          }
        }
      })
      .subscribe();

    // Polling định kỳ dự phòng mỗi 3 giây
    const pollInterval = setInterval(() => {
      fetchProductsFromSupabase().then(prods => {
        if (Array.isArray(prods) && prods.length > 0) {
          setProducts(prev => JSON.stringify(prev) !== JSON.stringify(prods) ? prods : prev);
        }
      });
      fetchConversationsFromSupabase().then(convs => {
        if (Array.isArray(convs)) {
          setConversations(prev => JSON.stringify(prev) !== JSON.stringify(convs) ? convs : prev);
        }
      });
    }, 3000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (bc) bc.close();
      supabase.removeChannel(realtimeChannel);
      clearInterval(pollInterval);
    };
  }, []);

  // Handlers
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCurrentTab('product_detail');
  };

  const handleStartChat = (product: Product) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    // Kiểm tra xem đã có cuộc hội thoại với sản phẩm này chưa
    const existingConvo = conversations.find(c => c.productId === product.id && (c.buyerId === currentUser.id || c.sellerId === currentUser.id));
    if (!existingConvo) {
      const newConvo: Conversation = {
        id: 'conv-' + Date.now(),
        productId: product.id,
        productTitle: product.title,
        productPrice: product.price,
        productImage: product.imageUrls[0] || '',
        buyerId: currentUser.id,
        buyerDisplayName: currentUser.displayName,
        sellerId: product.sellerId,
        sellerDisplayName: product.sellerDisplayName,
        lastMessage: 'Đã bắt đầu cuộc trò chuyện',
        updatedAt: new Date().toISOString()
      };

      const updatedConvos = [newConvo, ...conversations];
      setConversations(updatedConvos);
      localStorage.setItem('ntsell_conversations', JSON.stringify(updatedConvos));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('ntsell_channel');
        bc.postMessage({ type: 'CONVERSATIONS_UPDATED', payload: updatedConvos });
        bc.close();
      }
      upsertConversationToSupabase(newConvo);
    }

    setCurrentTab('chat');
  };

  const handlePublishProduct = (newProduct: Product) => {
    const updated = [newProduct, ...products];
    setProducts(updated);
    try {
      localStorage.setItem('ntsell_products', JSON.stringify(updated));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('ntsell_channel');
        bc.postMessage({ type: 'PRODUCTS_UPDATED', payload: updated });
        bc.close();
      }

      // Lưu trực tiếp lên Database Supabase đám mây
      insertProductToSupabase(newProduct);

      // Bắn thông báo tới Admin về yêu cầu đăng bán mới
      sendNotification({
        userId: 'admin',
        type: 'system',
        title: 'Có yêu cầu bán máy mới cần duyệt',
        message: `${newProduct.sellerDisplayName} vừa gửi yêu cầu duyệt máy "${newProduct.title}" (${newProduct.model}).`,
        linkTab: 'admin',
        relatedId: newProduct.id
      });
    } catch (err) {
      console.error('Lỗi lưu trữ sản phẩm:', err);
    }
    setCurrentTab('home');
  };

  const handleSendMessage = (conversationId: string, text: string) => {
    if (!currentUser) return;
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      conversationId,
      senderId: currentUser.id,
      senderDisplayName: currentUser.displayName,
      messageText: text,
      createdAt: new Date().toISOString()
    };
    const updatedMsgs = [...messages, newMsg];
    setMessages(updatedMsgs);

    const updatedConvs = conversations.map(c => 
      c.id === conversationId ? { ...c, lastMessage: text, updatedAt: new Date().toISOString() } : c
    );
    setConversations(updatedConvs);

    try {
      localStorage.setItem('ntsell_messages', JSON.stringify(updatedMsgs));
      localStorage.setItem('ntsell_conversations', JSON.stringify(updatedConvs));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('ntsell_channel');
        bc.postMessage({ type: 'MESSAGES_UPDATED', payload: updatedMsgs });
        bc.postMessage({ type: 'CONVERSATIONS_UPDATED', payload: updatedConvs });
        bc.close();
      }

      // Đồng bộ tin nhắn lên Supabase
      insertMessageToSupabase(newMsg);
      const activeConv = updatedConvs.find(c => c.id === conversationId);
      if (activeConv) {
        upsertConversationToSupabase(activeConv);
      }
    } catch {}
  };

  const handleUploadProof = (transactionId: string, role: 'buyer' | 'seller', videoUrl: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === transactionId) {
        if (role === 'seller') {
          return {
            ...t,
            sellerProofVideoUrl: videoUrl,
            status: 'awaiting_buyer_proof' as const,
            sellerConfirmedAt: new Date().toISOString()
          };
        } else {
          return {
            ...t,
            buyerProofVideoUrl: videoUrl,
            status: 'completed' as const,
            buyerConfirmedAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          };
        }
      }
      return t;
    }));
  };

  const handleFileDispute = (transactionId: string, reason: any, details: string) => {
    if (!currentUser) return;
    const newDispute: Dispute = {
      id: 'disp-' + Date.now(),
      transactionId,
      filedBy: currentUser.id,
      filedByDisplayName: currentUser.displayName,
      reason,
      details,
      proofUrls: [],
      status: 'investigating',
      createdAt: new Date().toISOString()
    };
    setDisputes([newDispute, ...disputes]);
    setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: 'disputed' as const } : t));
  };

  const handleTakeDownProduct = (id: string, reason?: string) => {
    const targetProd = products.find(p => p.id === id);
    const defaultReason = reason || 'Admin đã gỡ sản phẩm khỏi sàn do phát hiện dấu hiệu bất thường hoặc vi phạm';
    const updated = products.map(p => p.id === id ? { ...p, status: 'flagged' as const, adminNotes: defaultReason } : p);
    setProducts(updated);
    try {
      localStorage.setItem('ntsell_products', JSON.stringify(updated));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('ntsell_channel');
        bc.postMessage({ type: 'PRODUCTS_UPDATED', payload: updated });
        bc.close();
      }

      // Cập nhật lên Supabase Database
      updateProductStatusInSupabase(id, 'flagged', defaultReason);

      if (targetProd) {
        sendNotification({
          userId: targetProd.sellerId,
          type: 'product_flagged',
          title: 'Máy tính đã bị Admin gỡ khỏi sàn',
          message: `Sản phẩm "${targetProd.title}" của bạn đã bị gỡ khỏi sàn. Lý do: ${defaultReason}`,
          linkTab: 'dashboard',
          relatedId: targetProd.id
        });
      }
    } catch (err) {
      console.error('Lỗi lưu trữ sản phẩm:', err);
    }
  };

  const handleApproveProduct = (id: string) => {
    const targetProd = products.find(p => p.id === id);
    const updated = products.map(p => p.id === id ? { ...p, status: 'active' as const } : p);
    setProducts(updated);
    try {
      localStorage.setItem('ntsell_products', JSON.stringify(updated));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('ntsell_channel');
        bc.postMessage({ type: 'PRODUCTS_UPDATED', payload: updated });
        bc.close();
      }

      // Duyệt sản phẩm trên Supabase Database
      updateProductStatusInSupabase(id, 'active');

      if (targetProd) {
        sendNotification({
          userId: targetProd.sellerId,
          type: 'product_approved',
          title: 'Yêu cầu bán máy đã được Phê Duyệt! 🎉',
          message: `Chúc mừng bạn! Máy tính "${targetProd.title}" (${targetProd.model}) đã được Admin kiểm tra và xuất bản công khai lên Chợ Máy Tính.`,
          linkTab: 'dashboard',
          relatedId: targetProd.id
        });
      }
    } catch (err) {
      console.error('Lỗi lưu trữ sản phẩm:', err);
    }
  };

  const handleRequestEditProduct = (id: string, reason: string) => {
    const targetProd = products.find(p => p.id === id);
    const notes = reason || 'Admin yêu cầu bổ sung thông tin hoặc chụp lại ảnh rõ nét';
    const updated = products.map(p => p.id === id ? { ...p, status: 'requires_edit' as const, adminNotes: notes } : p);
    setProducts(updated);
    try {
      localStorage.setItem('ntsell_products', JSON.stringify(updated));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('ntsell_channel');
        bc.postMessage({ type: 'PRODUCTS_UPDATED', payload: updated });
        bc.close();
      }

      // Cập nhật yêu cầu sửa lên Supabase Database
      updateProductStatusInSupabase(id, 'requires_edit', notes);

      if (targetProd) {
        sendNotification({
          userId: targetProd.sellerId,
          type: 'product_requires_edit',
          title: 'Admin yêu cầu sửa / bổ sung bài đăng máy tính ⚠️',
          message: `Admin đã xem bài đăng "${targetProd.title}" và yêu cầu bạn bổ sung: "${notes}". Vui lòng bấm vào đây để sửa và gửi lại!`,
          linkTab: 'dashboard',
          relatedId: targetProd.id
        });
      }
    } catch (err) {
      console.error('Lỗi lưu trữ sản phẩm:', err);
    }
  };

  const handleRejectProduct = (id: string, reason?: string) => {
    const targetProd = products.find(p => p.id === id);
    const defaultReason = reason || 'Thông tin máy hoặc hình ảnh tem chống giả không khớp quy chế trường';
    const updated = products.map(p => p.id === id ? { ...p, status: 'rejected' as const, adminNotes: defaultReason } : p);
    setProducts(updated);
    try {
      localStorage.setItem('ntsell_products', JSON.stringify(updated));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('ntsell_channel');
        bc.postMessage({ type: 'PRODUCTS_UPDATED', payload: updated });
        bc.close();
      }

      // Cập nhật từ chối lên Supabase Database
      updateProductStatusInSupabase(id, 'rejected', defaultReason);

      if (targetProd) {
        sendNotification({
          userId: targetProd.sellerId,
          type: 'product_rejected',
          title: 'Yêu cầu bán máy đã bị Từ Chối (Bỏ hoàn toàn)',
          message: `Bài đăng "${targetProd.title}" đã bị từ chối duyệt. Lý do: ${defaultReason}`,
          linkTab: 'dashboard',
          relatedId: targetProd.id
        });
      }
    } catch (err) {
      console.error('Lỗi lưu trữ sản phẩm:', err);
    }
  };

  const handleDeleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    try {
      localStorage.setItem('ntsell_products', JSON.stringify(updated));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('ntsell_channel');
        bc.postMessage({ type: 'PRODUCTS_UPDATED', payload: updated });
        bc.close();
      }

      // Xóa trên Supabase Database
      deleteProductFromSupabase(id);
    } catch (err) {
      console.error('Lỗi xóa sản phẩm:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setSelectedProduct(null);
          setCurrentTab(tab);
        }}
        currentUser={currentUser}
        pendingCount={products.filter(p => p.status === 'pending_admin').length}
        notifications={notifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onClearAllNotifications={handleClearAllNotifications}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onLogout={() => setCurrentUser(null)}
      />

      {/* Main Content View with Smooth Tab Transitions */}
      <main className="flex-1 pb-16">
        <div key={currentTab} className="tab-content-enter">
          {currentTab === 'home' && (
            <MarketplaceHome
              products={products}
              onSelectProduct={handleSelectProduct}
              onOpenCreateModal={() => setCurrentTab('create_post')}
            />
          )}

          {currentTab === 'product_detail' && selectedProduct && (
            <ProductDetail
              product={selectedProduct}
              currentUser={currentUser}
              onBack={() => setCurrentTab('home')}
              onStartChat={handleStartChat}
              onOpenVideoGuide={() => setCurrentTab('video_guide')}
              onTakeDownProduct={(id, reason) => {
                handleTakeDownProduct(id, reason);
                setSelectedProduct(null);
                setCurrentTab('home');
              }}
            />
          )}

          {currentTab === 'create_post' && (
            currentUser ? (
              <CreatePost
                initialProduct={editingProduct}
                onSuccess={(savedProd) => {
                  if (editingProduct) {
                    // Cập nhật sản phẩm đã có thay vì nhân đôi
                    const updated = products.map(p => p.id === savedProd.id ? savedProd : p);
                    setProducts(updated);
                    try {
                      localStorage.setItem('ntsell_products', JSON.stringify(updated));
                      if (typeof BroadcastChannel !== 'undefined') {
                        const bc = new BroadcastChannel('ntsell_channel');
                        bc.postMessage({ type: 'PRODUCTS_UPDATED', payload: updated });
                        bc.close();
                      }
                      fetch('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updated)
                      }).catch(() => {});
                      
                      // Bắn thông báo tới Admin về yêu cầu cập nhật lại
                      sendNotification({
                        userId: 'admin',
                        type: 'system',
                        title: 'Người bán đã sửa & nộp lại máy',
                        message: `${savedProd.sellerDisplayName} vừa cập nhật và nộp lại máy "${savedProd.title}" sau khi bổ sung.`,
                        linkTab: 'admin',
                        relatedId: savedProd.id
                      });
                    } catch {}
                    setEditingProduct(null);
                    setCurrentTab('dashboard');
                  } else {
                    handlePublishProduct(savedProd);
                  }
                }}
                onCancel={() => {
                  setEditingProduct(null);
                  setCurrentTab('home');
                }}
                sellerId={currentUser.id}
                sellerDisplayName={currentUser.displayName}
                sellerTrustScore={currentUser.trustScore}
              />
            ) : (
              <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg">Yêu Cầu Xác Thực Học Sinh</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Để đảm bảo an toàn & chống gian lận trong trường, bạn cần đăng ký hoặc đăng nhập tài khoản học sinh đã được đối soát danh sách trước khi đăng bán máy tính.
                </p>
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20"
                >
                  Tạo Tài Khoản / Đăng Nhập Ngay
                </button>
              </div>
            )
          )}

          {currentTab === 'video_guide' && (
            <VideoProtocolGuide />
          )}

          {currentTab === 'transactions' && (
            <TransactionRoom
              transactions={transactions}
              onUploadProof={handleUploadProof}
              onOpenChat={() => setCurrentTab('chat')}
              onFileDispute={handleFileDispute}
            />
          )}

          {currentTab === 'chat' && (
            <ChatCenter
              conversations={conversations}
              messages={messages}
              currentUserId={currentUser?.id || 'user-current'}
              onSendMessage={handleSendMessage}
              onScheduleMeet={() => setCurrentTab('transactions')}
            />
          )}

          {currentTab === 'wiki' && (
            <WikiTerms />
          )}

          {currentTab === 'dashboard' && (
            currentUser ? (
              <UserDashboard
                currentUser={currentUser}
                products={products}
                transactions={transactions}
                onUpdateDisplayName={(name) => setCurrentUser({ ...currentUser, displayName: name })}
                onEditProduct={(prod) => {
                  setEditingProduct(prod);
                  setCurrentTab('create_post');
                }}
                onDeleteProduct={handleDeleteProduct}
              />
            ) : (
              <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg">Chưa Đăng Nhập Tài Khoản</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Vui lòng đăng ký tài khoản với tên và lớp học của bạn để quản lý hồ sơ bảo mật PII AES-256 và theo dõi lịch sử giao dịch.
                </p>
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20"
                >
                  Đăng Ký Tài Khoản Học Sinh Mới
                </button>
              </div>
            )
          )}

          {currentTab === 'admin' && (
            <AdminPanel
              products={products}
              transactions={transactions}
              disputes={disputes}
              onApproveProduct={handleApproveProduct}
              onRequestEditProduct={handleRequestEditProduct}
              onRejectProduct={handleRejectProduct}
              onTakeDownProduct={handleTakeDownProduct}
              onResolveDispute={(id, res) => setDisputes(disputes.map(d => d.id === id ? { ...d, status: res } : d))}
            />
          )}
        </div>
      </main>

      {/* Auth Modal (So khớp danh sách trường & Request Verification) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        roster={INITIAL_ROSTER}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center overflow-visible">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-3 select-none overflow-visible">
          <div className="font-script-flair text-2xl text-blue-600 inline-block hover:scale-105 transition-transform leading-normal px-2 py-1 overflow-visible">
            NTSell
          </div>
          <span className="text-slate-300 font-light text-lg select-none pb-1">—</span>
          <span className="font-script-flair text-lg text-slate-700 tracking-wider inline-block leading-normal px-1 py-1">
            Nền tảng Marketplace
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
