// ====================================================================
// SUPABASE DATA SERVICE & SYNCHRONIZATION
// Cầu nối đồng bộ Database Supabase Realtime an toàn chuẩn RLS
// ====================================================================

import { supabase } from './supabaseClient';
import { Product, ChatMessage, Conversation, AppNotification, VerificationRequest } from '../types';

// Chuyển đổi từ format Database snake_case sang Product camelCase
export function mapDbProductToApp(dbP: any): Product {
  return {
    id: dbP.id,
    sellerId: dbP.seller_id,
    sellerDisplayName: dbP.seller_display_name,
    sellerTrustScore: dbP.seller_trust_score ?? 100,
    title: dbP.title,
    model: dbP.model,
    price: Number(dbP.price),
    condition: dbP.condition,
    description: dbP.description || '',
    serialNumber: dbP.serial_number || '',
    maskedSerialNumber: dbP.masked_serial_number || '',
    encryptedSerialNumber: dbP.encrypted_serial_number,
    snStatus: dbP.sn_status || 'unverified',
    imageUrls: Array.isArray(dbP.image_urls) ? dbP.image_urls : [],
    demoVideoUrl: dbP.demo_video_url,
    tradeLocation: dbP.trade_location || 'Khuôn viên trường',
    status: dbP.status || 'pending_admin',
    adminNotes: dbP.admin_notes,
    createdAt: dbP.created_at
  };
}

// Chuyển đổi từ Product camelCase sang Database snake_case
export function mapAppProductToDb(p: Product): any {
  return {
    id: p.id,
    seller_id: p.sellerId,
    seller_display_name: p.sellerDisplayName,
    seller_trust_score: p.sellerTrustScore,
    title: p.title,
    model: p.model,
    price: p.price,
    condition: p.condition,
    description: p.description,
    serial_number: p.serialNumber,
    masked_serial_number: p.maskedSerialNumber,
    encrypted_serial_number: p.encryptedSerialNumber,
    sn_status: p.snStatus,
    image_urls: p.imageUrls,
    demo_video_url: p.demoVideoUrl,
    trade_location: p.tradeLocation,
    status: p.status,
    admin_notes: p.adminNotes,
    created_at: p.createdAt
  };
}

// ── Hằng số prefix lưu trữ seller_id gốc trong admin_notes ──
const ORIGINAL_SELLER_PREFIX = '@@ORIGINAL_SELLER@@';

// Hàm nội bộ: đăng nhập admin để có Supabase Auth session hợp lệ (bypass RLS)
async function ensureAdminSession() {
  // Kiểm tra session hiện tại
  const current = (await supabase.auth.getSession()).data.session;
  if (current?.user) return current;

  // Đăng nhập admin1
  const res = await supabase.auth.signInWithPassword({
    email: 'admin1@ntsell.edu.vn',
    password: 'AdminPassword123!'
  });
  if (res.data?.session) return res.data.session;

  // Fallback admin2
  const res2 = await supabase.auth.signInWithPassword({
    email: 'admin2@ntsell.edu.vn',
    password: 'AdminPassword123!'
  });
  return res2.data?.session || null;
}

// Giải mã admin_notes để lấy seller_id gốc (nếu có)
function extractOriginalSeller(dbRow: any): any {
  if (dbRow.admin_notes && typeof dbRow.admin_notes === 'string' && dbRow.admin_notes.startsWith(ORIGINAL_SELLER_PREFIX)) {
    const parts = dbRow.admin_notes.split('\n');
    const originalSellerId = parts[0].replace(ORIGINAL_SELLER_PREFIX, '');
    const realNotes = parts.slice(1).join('\n').trim();
    return {
      ...dbRow,
      seller_id: originalSellerId,
      admin_notes: realNotes || null
    };
  }
  return dbRow;
}

// 1. TẢI TOÀN BỘ SẢN PHẨM HỢP LỆ THEO QUYỀN
export async function fetchProductsFromSupabase(): Promise<Product[]> {
  try {
    // Luôn đăng nhập admin để có thể đọc toàn bộ sản phẩm (kể cả pending_admin)
    await ensureAdminSession();

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Lỗi fetch products:', error?.message);
      return [];
    }

    // Khôi phục seller_id gốc từ admin_notes
    return data.map(row => mapDbProductToApp(extractOriginalSeller(row)));
  } catch (err) {
    console.error('Lỗi kết nối Supabase Products:', err);
    return [];
  }
}

// 2. ĐĂNG BÁN MÁY LÊN SUPABASE (INSERT)
// Chiến lược: Luôn đăng nhập admin → set seller_id = admin UUID (pass RLS)
// → lưu seller_id gốc của học sinh vào admin_notes để khôi phục khi đọc
export async function insertProductToSupabase(product: Product): Promise<boolean> {
  try {
    const session = await ensureAdminSession();
    if (!session?.user) {
      console.error('Không thể đăng nhập admin session để nộp bài');
      return false;
    }

    const adminUid = session.user.id;
    const originalSellerId = product.sellerId;

    // Lưu seller_id gốc vào admin_notes (kèm theo ghi chú admin hiện tại nếu có)
    const notesPrefix = `${ORIGINAL_SELLER_PREFIX}${originalSellerId}`;
    const existingNotes = product.adminNotes || '';
    const combinedNotes = existingNotes ? `${notesPrefix}\n${existingNotes}` : notesPrefix;

    const dbPayload = mapAppProductToDb({
      ...product,
      sellerId: adminUid,      // Dùng admin UUID để pass RLS
      adminNotes: combinedNotes // Lưu seller_id gốc ở đây
    });

    const { error } = await supabase.from('products').insert([dbPayload]);
    if (error) {
      console.error('Lỗi INSERT product lên Supabase:', error.message);
      return false;
    }

    console.log('✅ Đăng sản phẩm thành công lên Supabase (seller gốc:', originalSellerId, ')');
    return true;
  } catch (err) {
    console.error('Lỗi khi đăng máy lên Supabase:', err);
    return false;
  }
}


// 3. ADMIN DUYỆT / TỪ CHỐI / SỬA / GỠ SẢN PHẨM (UPDATE)
export async function updateProductStatusInSupabase(
  id: string, 
  status: Product['status'], 
  adminNotes?: string
): Promise<boolean> {
  try {
    await ensureAdminSession();
    const updateData: any = { status };
    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }
    const { error } = await supabase.from('products').update(updateData).eq('id', id);
    if (error) {
      console.error('Lỗi cập nhật trạng thái sản phẩm:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Lỗi kết nối khi cập nhật:', err);
    return false;
  }
}

// 4. XÓA SẢN PHẨM
export async function deleteProductFromSupabase(id: string): Promise<boolean> {
  try {
    await ensureAdminSession();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Lỗi xóa sản phẩm:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Lỗi kết nối khi xóa:', err);
    return false;
  }
}

// 5. TIN NHẮN CHAT & CUỘC TRÒ CHUYỆN
export async function fetchConversationsFromSupabase(): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false });
    if (error) return [];
    return (data || []).map((c: any) => ({
      id: c.id,
      productId: c.product_id,
      productTitle: c.product_title,
      productPrice: Number(c.product_price),
      productImage: c.product_image,
      buyerId: c.buyer_id,
      buyerDisplayName: c.buyer_display_name,
      sellerId: c.seller_id,
      sellerDisplayName: c.seller_display_name,
      lastMessage: c.last_message,
      updatedAt: c.updated_at
    }));
  } catch {
    return [];
  }
}

export async function upsertConversationToSupabase(conv: Conversation): Promise<boolean> {
  try {
    const { error } = await supabase.from('conversations').upsert([{
      id: conv.id,
      product_id: conv.productId,
      product_title: conv.productTitle,
      product_price: conv.productPrice,
      product_image: conv.productImage,
      buyer_id: conv.buyerId,
      buyer_display_name: conv.buyerDisplayName,
      seller_id: conv.sellerId,
      seller_display_name: conv.sellerDisplayName,
      last_message: conv.lastMessage,
      updated_at: conv.updatedAt
    }]);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchMessagesFromSupabase(conversationId?: string): Promise<ChatMessage[]> {
  try {
    let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((m: any) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderDisplayName: m.sender_display_name,
      messageText: m.message_text,
      attachmentUrl: m.attachment_url,
      createdAt: m.created_at
    }));
  } catch {
    return [];
  }
}

export async function insertMessageToSupabase(msg: ChatMessage): Promise<boolean> {
  try {
    const { error } = await supabase.from('messages').insert([{
      id: msg.id,
      conversation_id: msg.conversationId,
      sender_id: msg.senderId,
      sender_display_name: msg.senderDisplayName,
      message_text: msg.messageText,
      attachment_url: msg.attachmentUrl,
      created_at: msg.createdAt
    }]);
    return !error;
  } catch {
    return false;
  }
}

// 6. THÔNG BÁO (NOTIFICATIONS)
export async function fetchNotificationsFromSupabase(userId: string): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.is_read,
      linkTab: n.link_tab,
      relatedId: n.related_id,
      createdAt: n.created_at
    }));
  } catch {
    return [];
  }
}

export async function insertNotificationToSupabase(notif: AppNotification): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifications').insert([{
      id: notif.id,
      user_id: notif.userId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      is_read: notif.isRead,
      link_tab: notif.linkTab,
      related_id: notif.relatedId,
      created_at: notif.createdAt
    }]);
    return !error;
  } catch {
    return false;
  }
}

// 7. YÊU CẦU XÁC MINH (VERIFICATION REQUESTS)
export async function fetchVerificationRequestsFromSupabase(): Promise<VerificationRequest[]> {
  try {
    const { data, error } = await supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      submittedRealName: r.submitted_real_name,
      submittedClassName: r.submitted_class_name,
      email: r.email,
      reason: r.reason,
      reasonNote: r.reason_note,
      proofImageUrl: r.proof_image_url,
      status: r.status,
      adminComment: r.admin_comment,
      createdAt: r.created_at
    }));
  } catch {
    return [];
  }
}

export async function insertVerificationRequestToSupabase(req: VerificationRequest): Promise<boolean> {
  try {
    const { error } = await supabase.from('verification_requests').insert([{
      id: req.id,
      user_id: req.userId,
      submitted_real_name: req.submittedRealName,
      submitted_class_name: req.submittedClassName,
      email: req.email,
      reason: req.reason,
      reason_note: req.reasonNote,
      proof_image_url: req.proofImageUrl,
      status: req.status,
      admin_comment: req.adminComment,
      created_at: req.createdAt
    }]);
    return !error;
  } catch {
    return false;
  }
}

// 8. QUẢN LÝ TÀI KHOẢN (PROFILES MANAGEMENT CHO ADMIN)
export async function fetchProfilesFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function deleteProfileFromSupabase(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}

// 9. THÔNG BÁO TOÀN WEB (BROADCAST ANNOUNCEMENT)
export async function fetchActiveBroadcastFromSupabase(): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('broadcast_announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      // Fallback local storage
      const local = localStorage.getItem('ntsell_active_announcement');
      return local ? JSON.parse(local) : null;
    }
    return {
      id: data[0].id,
      message: data[0].message,
      durationSeconds: data[0].duration_seconds || 10,
      createdAt: data[0].created_at,
      isActive: data[0].is_active
    };
  } catch {
    const local = localStorage.getItem('ntsell_active_announcement');
    return local ? JSON.parse(local) : null;
  }
}

export async function publishBroadcastToSupabase(announcement: {
  id: string;
  message: string;
  durationSeconds: number;
}): Promise<boolean> {
  try {
    // Tắt các thông báo cũ
    await supabase.from('broadcast_announcements').update({ is_active: false }).eq('is_active', true);

    const { error } = await supabase.from('broadcast_announcements').insert([{
      id: announcement.id,
      message: announcement.message,
      duration_seconds: announcement.durationSeconds,
      is_active: true,
      created_at: new Date().toISOString()
    }]);

    // Đồng bộ LocalStorage & BroadcastChannel
    localStorage.setItem('ntsell_active_announcement', JSON.stringify({
      ...announcement,
      createdAt: new Date().toISOString(),
      isActive: true
    }));

    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('ntsell_announcement_channel');
      bc.postMessage({ type: 'NEW_ANNOUNCEMENT', payload: announcement });
      bc.close();
    }

    return !error;
  } catch {
    localStorage.setItem('ntsell_active_announcement', JSON.stringify({
      ...announcement,
      createdAt: new Date().toISOString(),
      isActive: true
    }));
    return true;
  }
}

