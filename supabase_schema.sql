-- ====================================================================
-- DATABASE SCHEMA: MARKETPLACE MÁY TÍNH HỌC SINH (SUPABASE POSTGRESQL)
-- Kiến trúc tối ưu Zero-Cost Free Tier (< 10MB cho 1550+ học sinh)
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DANH SÁCH HỌC SINH TỪ TRƯỜNG (Import cuối mỗi kỳ)
CREATE TABLE IF NOT EXISTS school_students_roster (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    real_name VARCHAR(100) NOT NULL,
    class_name VARCHAR(20) NOT NULL, -- e.g. "10A1", "11B2", "12A3"
    school_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    student_code VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_roster_name_class ON school_students_roster (LOWER(TRIM(real_name)), LOWER(TRIM(class_name)));

-- 3. BẢNG HỒ SƠ NGƯỜI DÙNG (PROFILES - Liên kết Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_real_name TEXT NOT NULL,
    encrypted_class_name TEXT NOT NULL,
    encrypted_username TEXT NOT NULL,
    encrypted_phone TEXT,
    display_name VARCHAR(50) UNIQUE NOT NULL,
    trust_score INT DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
    completed_orders_count INT DEFAULT 0,
    violation_count INT DEFAULT 0,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'moderator', 'admin', 'superadmin')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending_verification', 'warned', 'suspended', 'soft_deleted')),
    warning_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. YÊU CẦU XÁC MINH (KHI TÊN/LỚP KHÔNG KHỚP DANH SÁCH TRƯỜNG)
CREATE TABLE IF NOT EXISTS verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    submitted_real_name VARCHAR(100) NOT NULL,
    submitted_class_name VARCHAR(20) NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('class_transfer', 'new_student', 'name_misspelled', 'other')),
    reason_note TEXT,
    proof_image_drive_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'more_info_needed')),
    admin_comment TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. DANH MỤC SERIAL NUMBER CASIO/FLEXIO CHÍNH HÃNG (CHỐNG MÃ GIẢ)
CREATE TABLE IF NOT EXISTS genuine_serial_numbers (
    serial_number VARCHAR(100) PRIMARY KEY,
    model VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(50) NOT NULL DEFAULT 'Casio',
    verification_status VARCHAR(20) DEFAULT 'genuine' CHECK (verification_status IN ('genuine', 'counterfeit', 'flagged_stolen')),
    notes TEXT
);

-- 6. SẢN PHẨM MÁY TÍNH ĐĂNG BÁN
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    model VARCHAR(100) NOT NULL,
    price NUMERIC(12, 0) NOT NULL CHECK (price >= 0),
    condition VARCHAR(50) NOT NULL CHECK (condition IN ('brand_new', 'like_new', 'used_good', 'needs_repair')),
    description TEXT NOT NULL,
    serial_number VARCHAR(100),
    sn_verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (sn_verification_status IN ('unverified', 'genuine', 'suspicious', 'counterfeit')),
    image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    demo_video_drive_url TEXT,
    trade_location_area VARCHAR(100) DEFAULT 'Khuôn viên trường học',
    status VARCHAR(20) DEFAULT 'pending_admin' CHECK (status IN ('pending_admin', 'active', 'reserved', 'sold', 'rejected', 'flagged')),
    admin_review_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products(status, created_at DESC) WHERE status = 'active';

-- 7. TIN NHẮN CHAT & THƯƠNG LƯỢNG (LƯU BẰNG CHỨNG BẤT BIẾN)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    last_message_preview TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(product_id, buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    attachment_drive_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. GIAO DỊCH & QUY TRÌNH QUAY VIDEO 5 BƯỚC
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    buyer_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    seller_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
    agreed_price NUMERIC(12, 0) NOT NULL,
    status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'awaiting_seller_proof', 'awaiting_buyer_proof', 'completed', 'disputed', 'cancelled'
    )),
    seller_proof_video_url TEXT,
    buyer_proof_video_url TEXT,
    payment_method VARCHAR(20) CHECK (payment_method IN ('bank_transfer', 'cash')),
    payment_proof_image_url TEXT,
    seller_confirmed_at TIMESTAMP WITH TIME ZONE,
    buyer_confirmed_at TIMESTAMP WITH TIME ZONE,
    auto_complete_at TIMESTAMP WITH TIME ZONE,
    video_cleanup_status VARCHAR(20) DEFAULT 'retained' CHECK (video_cleanup_status IN ('retained', 'ready_for_deletion', 'deleted_after_6m')),
    video_cleanup_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 9. KHIẾU NẠI & TRANH CHẤP (DISPUTES)
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    filed_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    dispute_reason VARCHAR(50) NOT NULL CHECK (dispute_reason IN ('item_not_as_described', 'item_broken_faulty', 'no_delivery_no_show', 'fraud_counterfeit', 'other')),
    details TEXT NOT NULL,
    additional_proof_urls JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'investigating' CHECK (status IN ('investigating', 'resolved_buyer_favored', 'resolved_seller_favored', 'mediated_mutual_agreement', 'escalated_to_school')),
    admin_ruling_notes TEXT,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. ĐÁNH GIÁ (REVIEWS & TRUST SCORE)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(transaction_id, reviewer_id)
);

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES profiles(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- SEED DATA MẪU
INSERT INTO school_students_roster (real_name, class_name, student_code) VALUES
('Nguyễn Văn An', '10A1', 'HS10A1-01'),
('Trần Thị Bình', '10A1', 'HS10A1-02'),
('Lê Hoàng Nam', '11B2', 'HS11B2-15'),
('Phạm Minh Châu', '11B2', 'HS11B2-22'),
('Vũ Đức Thắng', '12C3', 'HS12C3-08'),
('Đỗ Thảo Vy', '12C3', 'HS12C3-30')
ON CONFLICT DO NOTHING;

INSERT INTO genuine_serial_numbers (serial_number, model, manufacturer, verification_status, notes) VALUES
('580VNX-998234-VN', 'Casio FX-580VN X', 'Casio', 'genuine', 'Chính hãng Bitex phân phối'),
('580VNX-774921-VN', 'Casio FX-580VN X', 'Casio', 'genuine', 'Chính hãng Bitex phân phối'),
('570VNP-382910-VN', 'Casio FX-570VN Plus 2nd Edition', 'Casio', 'genuine', 'Tem chống giả phản quang'),
('FLX-799VN-00912', 'Flexio FX799VN', 'Flexio', 'genuine', 'Sản phẩm Bộ GD phê duyệt'),
('FAKE-580VN-00000', 'Casio FX-580VN Fake', 'Unverified', 'counterfeit', 'Mã báo cáo hàng nhái màn hình nhạt')
ON CONFLICT DO NOTHING;
