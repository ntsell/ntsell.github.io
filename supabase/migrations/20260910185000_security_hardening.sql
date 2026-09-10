-- ====================================================================
-- DATABASE SCHEMA: MARKETPLACE MÁY TÍNH HỌC SINH (SUPABASE POSTGRESQL)
-- Kiến trúc tối ưu Zero-Cost Free Tier kèm chuẩn bảo mật RLS & OWASP
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
    encrypted_real_name TEXT,
    encrypted_class_name TEXT,
    encrypted_username TEXT,
    encrypted_phone TEXT,
    display_name VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
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
    user_id TEXT,
    submitted_real_name VARCHAR(100) NOT NULL,
    submitted_class_name VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('class_transfer', 'new_student', 'name_misspelled', 'other')),
    reason_note TEXT,
    proof_image_url TEXT,
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
    seller_id TEXT NOT NULL,
    seller_display_name VARCHAR(100) DEFAULT 'Học sinh NTSell',
    seller_trust_score INT DEFAULT 100,
    title VARCHAR(200) NOT NULL,
    model VARCHAR(100) NOT NULL,
    price NUMERIC(12, 0) NOT NULL CHECK (price >= 0),
    condition VARCHAR(50) NOT NULL CHECK (condition IN ('brand_new', 'like_new', 'used_good', 'needs_repair')),
    description TEXT NOT NULL,
    serial_number VARCHAR(100),
    masked_serial_number VARCHAR(100),
    encrypted_serial_number TEXT,
    sn_status VARCHAR(20) DEFAULT 'unverified' CHECK (sn_status IN ('unverified', 'genuine', 'suspicious', 'counterfeit')),
    image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    demo_video_url TEXT,
    trade_location VARCHAR(100) DEFAULT 'Khuôn viên trường',
    status VARCHAR(20) DEFAULT 'pending_admin' CHECK (status IN ('pending_admin', 'active', 'reserved', 'sold', 'rejected', 'flagged', 'requires_edit')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products(status, created_at DESC) WHERE status = 'active';

-- 7. TIN NHẮN CHAT & THƯƠNG LƯỢNG
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID,
    product_title TEXT,
    product_price NUMERIC(12, 0),
    product_image TEXT,
    buyer_id TEXT NOT NULL,
    buyer_display_name TEXT,
    seller_id TEXT NOT NULL,
    seller_display_name TEXT,
    last_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_display_name TEXT,
    message_text TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. THÔNG BÁO (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    link_tab VARCHAR(50),
    related_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- 9. THÔNG BÁO TOÀN SÀN (BROADCAST ANNOUNCEMENTS)
CREATE TABLE IF NOT EXISTS broadcast_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    duration_seconds INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. GIAO DỊCH & QUY TRÌNH QUAY VIDEO 5 BƯỚC
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
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

-- 11. KHIẾU NẠI & TRANH CHẤP (DISPUTES)
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    filed_by TEXT NOT NULL,
    dispute_reason VARCHAR(50) NOT NULL CHECK (dispute_reason IN ('item_not_as_described', 'item_broken_faulty', 'no_delivery_no_show', 'fraud_counterfeit', 'other')),
    details TEXT NOT NULL,
    additional_proof_urls JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'investigating' CHECK (status IN ('investigating', 'resolved_buyer_favored', 'resolved_seller_favored', 'mediated_mutual_agreement', 'escalated_to_school')),
    admin_ruling_notes TEXT,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. ĐÁNH GIÁ (REVIEWS & TRUST SCORE)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 13. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id TEXT,
    actor_email TEXT,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 14. SEED DATA MẪU (SỬA LỖI THIẾU CHẤM PHẨY)
INSERT INTO school_students_roster (real_name, class_name, student_code) VALUES
('Nguyễn Văn An', '10A1', 'HS10A1-01'),
('Trần Thị Bình', '10A1', 'HS10A1-02'),
('Lê Hoàng Nam', '11B2', 'HS11B2-15'),
('Phạm Minh Châu', '11B2', 'HS11B2-22'),
('Vũ Đức Thắng', '12C3', 'HS12C3-08'),
('Đỗ Thảo Vy', '12C3', 'HS12C3-30');

-- 15. USER SESSIONS & SINGLE-DEVICE SESSION MANAGEMENT
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active);

-- 16. DỮ LIỆU CÁ NHÂN RIÊNG TƯ (USER PRIVATE DATA - TÁCH BIỆT KHỎI PUBLIC PROFILE)
CREATE TABLE IF NOT EXISTS user_private_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_real_name TEXT,
    encrypted_class_name TEXT,
    encrypted_phone TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 17. BẢNG QUẢN TRỊ VIÊN ĐỘC LẬP (CHỐNG LEO THANG ĐẶC QUYỀN TRÊN CLIENT)
CREATE TABLE IF NOT EXISTS admin_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- ====================================================================
-- KÍCH HOẠT ROW LEVEL SECURITY (RLS) TRÊN 100% CÁC BẢNG
-- ====================================================================

ALTER TABLE school_students_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_private_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE genuine_serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- HÀM BẢO MẬT HỆ THỐNG (SECURITY DEFINER FUNCTIONS)
-- ====================================================================

-- 1. Kiểm tra quyền Admin an toàn (từ JWT claims app_metadata hoặc bảng admin_roles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE AS $$
BEGIN
  RETURN (
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'superadmin')
    OR EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );
END;
$$;

-- 2. Kiểm tra Admin bắt buộc xác thực 2 bước (MFA / TOTP level AAL2)
CREATE OR REPLACE FUNCTION public.is_admin_aal2()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE AS $$
BEGIN
  -- Service role key (Edge Functions backend) bypass MFA
  IF auth.jwt() ->> 'role' = 'service_role' THEN
    RETURN TRUE;
  END IF;

  RETURN (
    public.is_admin()
    AND auth.jwt() ->> 'aal' = 'aal2'
  );
END;
$$;

-- 3. Trigger chặn leo thang đặc quyền: Không cho user tự cập nhật cột 'role' trong profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT (auth.jwt() ->> 'role' = 'service_role' OR public.is_admin_aal2()) THEN
      RAISE EXCEPTION 'Chỉ quản trị viên cấp cao có MFA mới được thay đổi vai trò (role).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();


-- ====================================================================
-- BỘ CHÍNH SÁCH BẢO MẬT (POLICIES)
-- ====================================================================

-- 1. PROFILES
CREATE POLICY "Users read own profile or admin read all" ON profiles
FOR SELECT USING (auth.uid() = id OR public.is_admin_aal2());

-- View công khai chỉ lộ các trường an toàn không nhạy cảm
CREATE OR REPLACE VIEW public_profiles 
WITH (security_invoker = true) AS
SELECT 
    id, 
    display_name, 
    trust_score, 
    role, 
    created_at
FROM profiles;

CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id OR public.is_admin_aal2())
WITH CHECK (auth.uid() = id OR public.is_admin_aal2());

CREATE POLICY "Admin can delete profile" ON profiles
FOR DELETE USING (public.is_admin_aal2());

-- 1.1. USER PRIVATE DATA
CREATE POLICY "Users manage own private data" ON user_private_data
FOR ALL USING (auth.uid() = user_id OR public.is_admin_aal2())
WITH CHECK (auth.uid() = user_id OR public.is_admin_aal2());

-- 1.2. ADMIN ROLES
CREATE POLICY "Admin roles read by admin aal2" ON admin_roles
FOR SELECT USING (public.is_admin_aal2());

CREATE POLICY "Admin roles manage by service role only" ON admin_roles
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 1.3. GENUINE SERIAL NUMBERS
CREATE POLICY "Public view genuine serial numbers" ON genuine_serial_numbers
FOR SELECT USING (true);

CREATE POLICY "Admin aal2 manage genuine serial numbers" ON genuine_serial_numbers
FOR ALL USING (public.is_admin_aal2())
WITH CHECK (public.is_admin_aal2());

-- 2. PRODUCTS
CREATE POLICY "Public view active products" ON products
FOR SELECT USING (status = 'active' OR seller_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "Users can create product" ON products
FOR INSERT WITH CHECK (seller_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "Seller or admin can update product" ON products
FOR UPDATE USING (seller_id = auth.uid()::text OR public.is_admin_aal2())
WITH CHECK (seller_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "Seller or admin can delete product" ON products
FOR DELETE USING (seller_id = auth.uid()::text OR public.is_admin_aal2());

-- 3. CONVERSATIONS
CREATE POLICY "Participants or admin view conversations" ON conversations
FOR SELECT USING (buyer_id = auth.uid()::text OR seller_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "Participants can create conversations" ON conversations
FOR INSERT WITH CHECK (buyer_id = auth.uid()::text OR seller_id = auth.uid()::text);

CREATE POLICY "Participants can update conversations" ON conversations
FOR UPDATE USING (buyer_id = auth.uid()::text OR seller_id = auth.uid()::text);

-- 4. CHAT MESSAGES
CREATE POLICY "Participants or admin view messages" ON chat_messages
FOR SELECT USING (
  sender_id = auth.uid()::text 
  OR EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid()::text OR c.seller_id = auth.uid()::text))
  OR public.is_admin_aal2()
);

CREATE POLICY "Users can send messages" ON chat_messages
FOR INSERT WITH CHECK (
  (sender_id = auth.uid()::text OR public.is_admin_aal2())
  AND (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid()::text OR c.seller_id = auth.uid()::text))
    OR public.is_admin_aal2()
  )
);

-- 5. NOTIFICATIONS
CREATE POLICY "Users view own notifications" ON notifications
FOR SELECT USING (user_id = auth.uid()::text OR (user_id = 'admin' AND public.is_admin_aal2()));

CREATE POLICY "System and users can insert notifications" ON notifications
FOR INSERT WITH CHECK (
  public.is_admin_aal2()
  OR user_id = auth.uid()::text
  OR EXISTS (SELECT 1 FROM conversations c WHERE c.buyer_id = auth.uid()::text OR c.seller_id = auth.uid()::text)
);

CREATE POLICY "Users can mark own notifications read" ON notifications
FOR UPDATE USING (user_id = auth.uid()::text OR (user_id = 'admin' AND public.is_admin_aal2()));

-- 6. BROADCAST ANNOUNCEMENTS
CREATE POLICY "Public view active broadcasts" ON broadcast_announcements
FOR SELECT USING (is_active = true OR public.is_admin_aal2());

CREATE POLICY "Admin can manage broadcasts" ON broadcast_announcements
FOR ALL USING (public.is_admin_aal2());

-- 7. TRANSACTIONS
CREATE POLICY "Parties or admin view transactions" ON transactions
FOR SELECT USING (buyer_id = auth.uid()::text OR seller_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "Parties can create transactions" ON transactions
FOR INSERT WITH CHECK (buyer_id = auth.uid()::text OR seller_id = auth.uid()::text);

CREATE POLICY "Parties or admin update transactions" ON transactions
FOR UPDATE USING (buyer_id = auth.uid()::text OR seller_id = auth.uid()::text OR public.is_admin_aal2());

-- 8. DISPUTES
CREATE POLICY "Filed user or admin view disputes" ON disputes
FOR SELECT USING (filed_by = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "Users can file disputes" ON disputes
FOR INSERT WITH CHECK (filed_by = auth.uid()::text OR public.is_admin_aal2());

-- 9. USER SESSIONS
CREATE POLICY "User xem session rieng" ON user_sessions
FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "User tao session" ON user_sessions
FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "User cap nhat session rieng" ON user_sessions
FOR UPDATE USING (user_id = auth.uid()::text OR public.is_admin_aal2())
WITH CHECK (user_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "User logout session rieng" ON user_sessions
FOR DELETE USING (user_id = auth.uid()::text OR public.is_admin_aal2());

-- 10. VERIFICATION REQUESTS
CREATE POLICY "User or admin view verification requests" ON verification_requests
FOR SELECT USING (user_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "User can submit verification request" ON verification_requests
FOR INSERT WITH CHECK (user_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "Admin can update verification request" ON verification_requests
FOR UPDATE USING (public.is_admin_aal2());

-- 11. ROSTER, REVIEWS & AUDIT LOGS
-- CHỈ CHO PHÉP ADMIN CÓ MFA XEM TOÀN BỘ DANH SÁCH HỌC SINH (CHỐNG RÒ RỈ DỮ LIỆU CÁ NHÂN THEO NGHỊ ĐỊNH 13/2023)
DROP POLICY IF EXISTS "Authenticated users view roster" ON school_students_roster;

CREATE POLICY "Admin aal2 view roster" ON school_students_roster
FOR SELECT
TO authenticated
USING (public.is_admin_aal2());

CREATE POLICY "Admin aal2 manage roster" ON school_students_roster
FOR ALL
TO authenticated
USING (public.is_admin_aal2())
WITH CHECK (public.is_admin_aal2());

CREATE POLICY "Public view reviews" ON reviews
FOR SELECT USING (true);

CREATE POLICY "Users can write reviews" ON reviews
FOR INSERT WITH CHECK (reviewer_id = auth.uid()::text OR public.is_admin_aal2());

CREATE POLICY "Admin view audit logs" ON audit_logs
FOR SELECT USING (public.is_admin_aal2());

CREATE POLICY "Admin insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (public.is_admin_aal2() OR auth.jwt() ->> 'role' = 'service_role');


-- ====================================================================
-- HÀM RPC ĐỐI SOÁT HỌC SINH AN TOÀN (KHÔNG DUMP BẢNG ROSTER)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.verify_student_roster(
    p_real_name TEXT,
    p_class_name TEXT
)
RETURNS TABLE (
    is_matched BOOLEAN,
    match_count INT,
    student_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INT;
    v_code TEXT;
BEGIN
    SELECT COUNT(*), MIN(s.student_code)
    INTO v_count, v_code
    FROM public.school_students_roster s
    WHERE LOWER(TRIM(s.real_name)) = LOWER(TRIM(p_real_name))
      AND LOWER(TRIM(s.class_name)) = LOWER(TRIM(p_class_name))
      AND s.is_active = TRUE;

    RETURN QUERY
    SELECT 
        (v_count > 0) AS is_matched,
        v_count AS match_count,
        CASE WHEN v_count = 1 THEN v_code ELSE NULL END AS student_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_student_roster(TEXT, TEXT) TO anon, authenticated;


-- ====================================================================
-- CUSTOM ACCESS TOKEN (JWT) HOOK CHO SUPABASE AUTH
-- Gán role từ bảng admin_roles vào JWT claims tự động khi login
-- ====================================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
BEGIN
  claims := event->'claims';
  SELECT role INTO user_role FROM public.admin_roles WHERE user_id = (event->>'user_id')::uuid;
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  END IF;
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;


-- ====================================================================
-- AUDIT LOG TRIGGERS TỰ ĐỘNG BẮT SỰ KIỆN ADMIN & DỮ LIỆU
-- ====================================================================
CREATE OR REPLACE FUNCTION public.log_admin_action_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_actor_id TEXT;
  current_actor_email TEXT;
  target_id_val TEXT;
  changes_data JSONB;
BEGIN
  current_actor_id := auth.uid()::text;
  current_actor_email := COALESCE(auth.jwt() ->> 'email', 'system');

  IF TG_OP = 'DELETE' THEN
    target_id_val := OLD.id::text;
    changes_data := jsonb_build_object('old', to_jsonb(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    target_id_val := NEW.id::text;
    changes_data := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    target_id_val := NEW.id::text;
    changes_data := jsonb_build_object('new', to_jsonb(NEW));
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    actor_email,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    current_actor_id,
    current_actor_email,
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    target_id_val,
    changes_data
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_products ON products;
CREATE TRIGGER trg_audit_products
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action_trigger();

DROP TRIGGER IF EXISTS trg_audit_profiles ON profiles;
CREATE TRIGGER trg_audit_profiles
AFTER UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action_trigger();

DROP TRIGGER IF EXISTS trg_audit_admin_roles ON admin_roles;
CREATE TRIGGER trg_audit_admin_roles
AFTER INSERT OR UPDATE OR DELETE ON admin_roles
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action_trigger();

DROP TRIGGER IF EXISTS trg_audit_disputes ON disputes;
CREATE TRIGGER trg_audit_disputes
AFTER UPDATE OR DELETE ON disputes
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action_trigger();


-- ====================================================================
-- DATABASE RATE LIMITING CHỐNG BRUTE FORCE TẠI PHÍA SERVER
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    key TEXT PRIMARY KEY,
    attempts INT NOT NULL DEFAULT 1,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
    blocked_until TIMESTAMPTZ
);
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
    p_key TEXT,
    p_max_attempts INT DEFAULT 5,
    p_window_seconds INT DEFAULT 900,
    p_block_seconds INT DEFAULT 900
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    rec RECORD;
    v_now TIMESTAMPTZ := now();
    v_is_blocked BOOLEAN := FALSE;
    v_remaining_seconds INT := 0;
BEGIN
    SELECT * INTO rec FROM public.auth_rate_limits WHERE key = p_key FOR UPDATE;

    IF FOUND THEN
        IF rec.blocked_until IS NOT NULL AND rec.blocked_until > v_now THEN
            v_is_blocked := TRUE;
            v_remaining_seconds := CEIL(EXTRACT(EPOCH FROM (rec.blocked_until - v_now)))::INT;
            RETURN jsonb_build_object('allowed', FALSE, 'blocked', TRUE, 'remaining_seconds', v_remaining_seconds);
        END IF;

        IF v_now > (rec.last_attempt + (p_window_seconds || ' seconds')::INTERVAL) THEN
            UPDATE public.auth_rate_limits
            SET attempts = 1, last_attempt = v_now, blocked_until = NULL
            WHERE key = p_key;
            RETURN jsonb_build_object('allowed', TRUE, 'blocked', FALSE, 'attempts', 1);
        ELSE
            IF rec.attempts + 1 >= p_max_attempts THEN
                UPDATE public.auth_rate_limits
                SET attempts = rec.attempts + 1,
                    last_attempt = v_now,
                    blocked_until = v_now + (p_block_seconds || ' seconds')::INTERVAL
                WHERE key = p_key;
                RETURN jsonb_build_object('allowed', FALSE, 'blocked', TRUE, 'remaining_seconds', p_block_seconds);
            ELSE
                UPDATE public.auth_rate_limits
                SET attempts = rec.attempts + 1, last_attempt = v_now
                WHERE key = p_key;
                RETURN jsonb_build_object('allowed', TRUE, 'blocked', FALSE, 'attempts', rec.attempts + 1);
            END IF;
        END IF;
    ELSE
        INSERT INTO public.auth_rate_limits (key, attempts, last_attempt)
        VALUES (p_key, 1, v_now);
        RETURN jsonb_build_object('allowed', TRUE, 'blocked', FALSE, 'attempts', 1);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_record_rate_limit(TEXT, INT, INT, INT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.reset_rate_limit(p_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_email TEXT;
    v_caller_uid TEXT;
BEGIN
    -- Service role (Edge Functions/Backend) có toàn quyền
    IF auth.jwt() ->> 'role' = 'service_role' THEN
        DELETE FROM public.auth_rate_limits WHERE key = p_key;
        RETURN;
    END IF;

    -- Bắt buộc phải là user đã xác thực phiên
    v_caller_uid := auth.uid()::text;
    IF v_caller_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Người dùng chưa đăng nhập không được phép reset rate limit.';
    END IF;

    v_caller_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));

    -- Chỉ cho phép tự reset khóa liên quan đến tài khoản của chính mình, hoặc Admin AAL2
    IF public.is_admin_aal2() 
       OR (v_caller_email <> '' AND p_key = 'admin_' || v_caller_email)
       OR (v_caller_email <> '' AND p_key = 'student_' || v_caller_email)
       OR (v_caller_email <> '' AND p_key = 'otp_' || v_caller_email)
       OR p_key = 'user_' || v_caller_uid
    THEN
        DELETE FROM public.auth_rate_limits WHERE key = p_key;
    ELSE
        RAISE EXCEPTION 'Forbidden: Bạn không có quyền xóa rate limit của khóa này.';
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_rate_limit(TEXT) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit(TEXT) TO authenticated;


