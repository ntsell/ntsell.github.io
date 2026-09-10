// ====================================================================
// MOCK & LOCAL DATABASE SEED
// Dữ liệu mẫu chuẩn hóa: Danh sách trường, Sản phẩm, Giao dịch
// ====================================================================

import { StudentRosterItem, Product, Transaction, Dispute, UserProfile } from '../types';

import rawStudents from './studentsDatabase.json';

export const INITIAL_ROSTER: StudentRosterItem[] = [
  ...rawStudents.map((s, idx) => {
    const grade = s.class.startsWith('10') ? '10' : s.class.startsWith('11') ? '11' : '12';
    const birthYear = grade === '10' ? 2010 : grade === '11' ? 2009 : 2008;
    const cohort = grade === '10' ? 'K2025-2028' : grade === '11' ? 'K2024-2027' : 'K2023-2026';
    return {
      id: `hs-${idx + 1}`,
      realName: s.name,
      className: s.class,
      studentCode: `HS-${s.class}-${String(idx + 1).padStart(3, '0')}`,
      birthYear,
      cohort
    };
  }),
  // Bổ sung học sinh trùng tên & lớp để kiểm thử trường hợp "Nhiều người cùng tên & lớp"
  {
    id: 'hs-dup-1',
    realName: 'Nguyễn Văn An',
    className: '10C1',
    studentCode: 'HS-10C1-998',
    birthYear: 2010,
    cohort: 'K2025-2028 (Hệ Tiêu Chuẩn)'
  },
  {
    id: 'hs-dup-2',
    realName: 'Nguyễn Văn An',
    className: '10C1',
    studentCode: 'HS-10C1-999',
    birthYear: 2009,
    cohort: 'K2025-2028 (Chuyển Hệ/Học sớm)'
  }
];

export const GENUINE_SERIAL_NUMBERS: Record<string, { model: string; status: 'genuine' | 'counterfeit' | 'suspicious'; note: string }> = {
  '580VNX-998234-VN': { model: 'Casio FX-580VN X', status: 'genuine', note: 'Chính hãng Bitex, tem chống giả Laser phản quang 7 màu' },
  '580VNX-774921-VN': { model: 'Casio FX-580VN X', status: 'genuine', note: 'Chính hãng Bitex, còn bảo hành 5 năm' },
  '570VNP-382910-VN': { model: 'Casio FX-570VN Plus (2nd Ed)', status: 'genuine', note: 'Chính hãng Casio sản xuất Thái Lan' },
  'FLX-799VN-00912': { model: 'Flexio FX799VN', status: 'genuine', note: 'Chính hãng Thiên Long, Bộ GD&ĐT cấp phép thi tốt nghiệp' },
  'FAKE-580VN-00000': { model: 'Casio FX-580VN Nhái', status: 'counterfeit', note: 'CẢNH BÁO: Mã S/N hàng giả, màn hình nhạt góc nghiêng, phím ọp ẹp' }
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-calc-1',
    sellerId: 'hs-1',
    sellerDisplayName: 'NamHoang_12A1',
    sellerTrustScore: 96,
    title: 'Máy tính Casio FX-580VN X màu đen còn mới 95%, nguyên tem Bitex',
    model: 'FX-580VN',
    price: 480000,
    condition: 'like_new',
    description: 'Máy dùng giữ gìn cẩn thận từ đầu năm lớp 11, phím bấm nảy, màn hình sáng rõ không trầy xước. Đã dán tem bảo hành Bitex chính hãng.',
    serialNumber: '580VNX-998234-VN',
    maskedSerialNumber: '580VNX-••••••-VN',
    snStatus: 'genuine',
    imageUrls: [
      'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?w=800&auto=format&fit=crop&q=80'
    ],
    tradeLocation: 'Căn tin trường THPT giờ ra chơi tiết 3',
    status: 'active',
    category: 'calculator',
    createdAt: '2026-09-08T10:30:00Z'
  },
  {
    id: 'prod-calc-2',
    sellerId: 'hs-2',
    sellerDisplayName: 'MinhAnh_11B2',
    sellerTrustScore: 92,
    title: 'Casio FX-570VN Plus 2nd Edition hoạt động tốt, phím êm',
    model: 'FX-570VN',
    price: 320000,
    condition: 'used_good',
    description: 'Máy phụ ít dùng để trong cặp, pin vừa thay mới toanh. Tặng kèm nắp trượt chống va đập.',
    serialNumber: '570VNP-382910-VN',
    maskedSerialNumber: '570VNP-••••••-VN',
    snStatus: 'genuine',
    imageUrls: [
      'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?w=800&auto=format&fit=crop&q=80'
    ],
    tradeLocation: 'Cổng phụ số 2 sau giờ tan học',
    status: 'active',
    category: 'calculator',
    createdAt: '2026-09-07T14:15:00Z'
  },
  {
    id: 'prod-doc-1',
    sellerId: 'hs-3',
    sellerDisplayName: 'HaLinh_ThuKhoa',
    sellerTrustScore: 99,
    title: 'Bộ Tổng Ôn Toán 12 & 30 Đề Thi Thử THPT Quốc Gia (Kèm Giải Chi Tiết)',
    model: 'Tài liệu in',
    price: 45000,
    condition: 'like_new',
    description: 'Tài liệu do mình tổng hợp phương pháp bấm máy Casio giải nhanh hàm số, tích phân, Oxyz và 30 đề thi thử các trường chuyên có lời giải chi tiết từng bước. Sách in bìa màu, gáy xoắn cẩn thận.',
    imageUrls: [
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&auto=format&fit=crop&q=80'
    ],
    tradeLocation: 'Bàn ghế đá sân bóng trường THPT',
    status: 'active',
    category: 'document',
    subject: 'Toán',
    grade: 'Lớp 12',
    docFormat: 'paper',
    pageCount: 180,
    createdAt: '2026-09-09T09:00:00Z'
  },
  {
    id: 'prod-doc-2',
    sellerId: 'hs-4',
    sellerDisplayName: 'TuanKiet_12Ly',
    sellerTrustScore: 95,
    title: 'Sổ Tay Công Thức Trọng Tâm Vật Lý 10-11-12 Ôn Thi ĐGNL / ĐGTD',
    model: 'Tài liệu in',
    price: 30000,
    condition: 'like_new',
    description: 'Bản in khổ A5 nhỏ gọn bỏ túi, tóm tắt toàn bộ sơ đồ tư duy Mindmap Lý thuyết & Công thức tính nhanh Vật lý phục vụ kỳ thi Đánh giá năng lực ĐHQG và ĐHQGHN.',
    imageUrls: [
      'https://images.unsplash.com/photo-1532012164546-f432f2e3edd8?w=800&auto=format&fit=crop&q=80'
    ],
    tradeLocation: 'Hành lang tầng 2 dãy nhà A',
    status: 'active',
    category: 'document',
    subject: 'Vật Lý',
    grade: 'Ôn Thi ĐGNL/ĐGTD',
    docFormat: 'paper',
    pageCount: 96,
    createdAt: '2026-09-09T11:20:00Z'
  },
  {
    id: 'prod-doc-3',
    sellerId: 'hs-5',
    sellerDisplayName: 'ThuTrang_AnhVan',
    sellerTrustScore: 98,
    title: 'Bộ Đề Thi Học Kỳ & Dàn Ý Văn 11 Mới (Tặng Miễn Phí Đàn Em Khóa Dưới)',
    model: 'Tài liệu số',
    price: 0,
    condition: 'like_new',
    description: 'Tuyển tập mở bài, kết bài nâng cao và hệ thống luận điểm các tác phẩm Ngữ văn 11 bộ Kết Nối Tri Thức. Tặng 0đ cho bạn nào cần ôn tập trước kỳ thi giữa kỳ!',
    imageUrls: [
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80'
    ],
    tradeLocation: 'Nhận link Drive tải trực tiếp qua khung Chat',
    status: 'active',
    category: 'document',
    subject: 'Ngữ Văn',
    grade: 'Lớp 11',
    docFormat: 'digital',
    pageCount: 52,
    createdAt: '2026-09-10T08:15:00Z'
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const CURRENT_USER_MOCK: UserProfile = {
  id: 'user-current',
  encryptedRealName: 'ENC_Tmd1eeG7hW4gVsSDbiBBbg==_fa89b211', // Nguyễn Văn An
  encryptedClassName: 'ENC_MTBBMQ==_88ac2e91', // 10A1
  encryptedUsername: 'ENC_bmd1eWVuX3Zhbl9h_7f991100',
  displayName: 'TechLover10A',
  phone: '0987654321',
  trustScore: 98,
  completedOrdersCount: 4,
  violationCount: 0,
  role: 'student',
  status: 'active',
  createdAt: '2026-08-20T08:00:00Z'
};
