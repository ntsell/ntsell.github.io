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
    seller_display_name: p.sellerDisplayName || 'Học sinh NTSell',
    seller_trust_score: p.sellerTrustScore ?? 100,
    title: p.title,
    model: p.model,
    price: Number(p.price),
    condition: p.condition,
    description: p.description || '',
    serial_number: p.serialNumber || '',
    masked_serial_number: p.maskedSerialNumber || '',
    encrypted_serial_number: p.encryptedSerialNumber || null,
    sn_status: p.snStatus || 'unverified',
    image_urls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
    demo_video_url: p.demoVideoUrl || null,
    trade_location: p.tradeLocation || 'Khuôn viên trường',
    status: p.status || 'pending_admin',
    admin_notes: p.adminNotes || null,
    created_at: p.createdAt || new Date().toISOString()
  };
}

// ── Hằng số prefix lưu trữ seller_id gốc trong admin_notes (fallback tương thích cũ) ──
const ORIGINAL_SELLER_PREFIX = '@@ORIGINAL_SELLER@@';

// Giải mã admin_notes để lấy seller_id gốc (nếu có bài cũ dùng prefix)
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
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('Lỗi fetch products:', error?.message);
      return [];
    }

    return data.map(row => mapDbProductToApp(extractOriginalSeller(row)));
  } catch (err) {
    console.error('Lỗi kết nối Supabase Products:', err);
    return [];
  }
}

// 2. ĐĂNG BÁN MÁY LÊN SUPABASE (INSERT)
export async function insertProductToSupabase(product: Product): Promise<boolean> {
  try {
    const dbPayload = mapAppProductToDb(product);
    const { error } = await supabase.from('products').insert([dbPayload]);
    if (error) {
      console.error('Lỗi INSERT product lên Supabase:', error.message);
      return false;
    }

    console.log('✅ Đăng sản phẩm thành công lên Supabase:', product.id);
    return true;
  } catch (err) {
    console.error('Lỗi khi đăng máy lên Supabase:', err);
    return false;
  }
}


// 3. THAO TÁC QUẢN TRỊ VIÊN QUA EDGE FUNCTION (BẮT BUỘC MFA)
export async function invokeAdminAction(action: string, payload: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action, payload },
      headers: { Authorization: `Bearer ${token}` }
    });
    if (error || data?.error) {
      const errMsg = data?.message || data?.error || error?.message || 'Lỗi thực thi thao tác quản trị';
      console.error('Lỗi Edge Function admin-actions:', errMsg);
      return { success: false, error: errMsg };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Lỗi kết nối Edge Function admin-actions:', err);
    return { success: false, error: err.message };
  }
}

// ADMIN DUYỆT / TỪ CHỐI / SỬA / GỠ SẢN PHẨM (QUA EDGE FUNCTION)
export async function updateProductStatusInSupabase(
  id: string, 
  status: Product['status'], 
  adminNotes?: string
): Promise<boolean> {
  try {
    let action = 'approve_product';
    if (status === 'requires_edit') action = 'request_edit_product';
    else if (status === 'rejected') action = 'reject_product';
    else if (status === 'flagged') action = 'takedown_product';

    const res = await invokeAdminAction(action, { id, reason: adminNotes });
    if (!res.success && res.error) {
      if (res.error.includes('MFA')) {
        alert(res.error);
      }
    }
    return res.success;
  } catch (err) {
    console.error('Lỗi kết nối khi cập nhật sản phẩm:', err);
    return false;
  }
}

// 4. XÓA SẢN PHẨM (QUA EDGE FUNCTION)
export async function deleteProductFromSupabase(id: string): Promise<boolean> {
  const res = await invokeAdminAction('delete_product', { id });
  if (!res.success && res.error) {
    if (res.error.includes('MFA')) {
      alert(res.error);
    }
  }
  return res.success;
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
    let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
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
    const { error } = await supabase.from('chat_messages').insert([{
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
  const res = await invokeAdminAction('delete_user', { userId });
  if (!res.success && res.error) {
    if (res.error.includes('MFA')) {
      alert(res.error);
    }
  }
  return res.success;
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
    const res = await invokeAdminAction('publish_broadcast', { announcement });
    if (!res.success && res.error) {
      if (res.error.includes('MFA')) {
        alert(res.error);
      }
    }

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

    return res.success;
  } catch {
    localStorage.setItem('ntsell_active_announcement', JSON.stringify({
      ...announcement,
      createdAt: new Date().toISOString(),
      isActive: true
    }));
    return true;
  }
}

// 10. NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOGS)
export async function insertAuditLog(log: {
  action: string;
  targetType: string;
  targetId?: string;
  details?: any;
}): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    await supabase.from('audit_logs').insert([{
      actor_id: user?.id || 'anonymous',
      actor_email: user?.email || undefined,
      action: log.action,
      target_type: log.targetType,
      target_id: log.targetId || undefined,
      details: log.details || {}
    }]);
  } catch (err) {
    console.warn('Ghi audit log thất bại:', err);
  }
}

export async function fetchAuditLogs(limit: number = 100): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// 11. DỮ LIỆU CÁ NHÂN RIÊNG TƯ (USER PRIVATE DATA - TÁCH BIỆT KHỎI PUBLIC PROFILE)
export async function saveUserPrivateData(userId: string, data: {
  encryptedRealName?: string;
  encryptedClassName?: string;
  encryptedPhone?: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_private_data').upsert({
      user_id: userId,
      encrypted_real_name: data.encryptedRealName,
      encrypted_class_name: data.encryptedClassName,
      encrypted_phone: data.encryptedPhone,
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

export async function fetchUserPrivateData(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('user_private_data')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error || !data) return null;
    return {
      encryptedRealName: data.encrypted_real_name,
      encryptedClassName: data.encrypted_class_name,
      encryptedPhone: data.encrypted_phone
    };
  } catch {
    return null;
  }
}

