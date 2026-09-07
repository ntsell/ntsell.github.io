// ==========================================
// DATA MODELS & TYPES
// Hệ thống Sàn Máy Tính Casio / Flexio
// ==========================================

export type UserRole = 'student' | 'moderator' | 'admin' | 'superadmin';
export type AccountStatus = 'active' | 'pending_verification' | 'warned' | 'suspended' | 'soft_deleted';

export interface StudentRosterItem {
  id: string;
  realName: string;
  className: string;
  studentCode: string;
  birthYear?: number | string;
  cohort?: string;
}

export interface UserProfile {
  id: string;
  encryptedRealName: string;
  encryptedClassName: string;
  encryptedUsername: string;
  displayName: string;
  email?: string;
  phone?: string;
  trustScore: number;
  completedOrdersCount: number;
  violationCount: number;
  role: UserRole;
  status: AccountStatus;
  warningReason?: string;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  submittedRealName: string;
  submittedClassName: string;
  email?: string;
  reason: 'class_transfer' | 'new_student' | 'name_misspelled' | 'other';
  reasonNote?: string;
  proofImageUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'more_info_needed';
  adminComment?: string;
  createdAt: string;
}

export type ProductCondition = 'brand_new' | 'like_new' | 'used_good' | 'needs_repair';
export type ProductStatus = 'pending_admin' | 'active' | 'reserved' | 'sold' | 'rejected' | 'flagged' | 'requires_edit';
export type SNStatus = 'unverified' | 'genuine' | 'suspicious' | 'counterfeit';

export interface Product {
  id: string;
  sellerId: string;
  sellerDisplayName: string;
  sellerTrustScore: number;
  title: string;
  model: string;
  price: number;
  condition: ProductCondition;
  description: string;
  serialNumber: string;
  maskedSerialNumber?: string;
  encryptedSerialNumber?: string;
  snStatus: SNStatus;
  imageUrls: string[];
  demoVideoUrl?: string;
  tradeLocation: string;
  status: ProductStatus;
  adminNotes?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderDisplayName: string;
  messageText: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  productImage: string;
  buyerId: string;
  buyerDisplayName: string;
  sellerId: string;
  sellerDisplayName: string;
  lastMessage: string;
  updatedAt: string;
}

export type TransactionStatus = 
  | 'scheduled'            // Thỏa thuận hẹn gặp offline
  | 'awaiting_seller_proof' // Chờ seller upload video
  | 'awaiting_buyer_proof'  // Chờ buyer xác nhận / upload video
  | 'completed'             // Hoàn tất
  | 'disputed'              // Tranh chấp
  | 'cancelled';

export interface Transaction {
  id: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  buyerId: string;
  buyerDisplayName: string;
  sellerId: string;
  sellerDisplayName: string;
  agreedPrice: number;
  status: TransactionStatus;
  sellerProofVideoUrl?: string;
  buyerProofVideoUrl?: string;
  paymentMethod?: 'bank_transfer' | 'cash';
  paymentProofUrl?: string;
  sellerConfirmedAt?: string;
  buyerConfirmedAt?: string;
  autoCompleteAt?: string; // 5 days SLA
  createdAt: string;
  completedAt?: string;
}

export interface Dispute {
  id: string;
  transactionId: string;
  filedBy: string;
  filedByDisplayName: string;
  reason: 'item_not_as_described' | 'item_broken_faulty' | 'no_delivery_no_show' | 'fraud_counterfeit' | 'other';
  details: string;
  proofUrls: string[];
  status: 'investigating' | 'resolved_buyer_favored' | 'resolved_seller_favored' | 'mediated_mutual_agreement';
  adminRulingNotes?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  transactionId: string;
  reviewerId: string;
  reviewerDisplayName: string;
  targetUserId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export type NotificationType = 
  | 'new_message' 
  | 'product_approved' 
  | 'product_rejected' 
  | 'product_requires_edit' 
  | 'product_flagged' 
  | 'system';

export interface AppNotification {
  id: string;
  userId: string; // ID người nhận thông báo
  type: NotificationType;
  title: string;
  message: string;
  linkTab?: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  userDisplayName?: string;
  deviceFingerprint: string;
  deviceName: string;
  ipAddress?: string;
  lastActivity: string;
  createdAt: string;
  isActive: boolean;
}


