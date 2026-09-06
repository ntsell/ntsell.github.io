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

export const INITIAL_PRODUCTS: Product[] = [];

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
