# QUY TRÌNH SAO LƯU VÀ PHỤC HỒI DỮ LIỆU (BACKUP & RESTORE)
**Hệ thống**: NT-Sell (Chợ Trao Đổi Đồ Dùng Học Tập Học Sinh)  
**Cơ sở dữ liệu**: Supabase PostgreSQL (`ymitxuvpclufooypltqo`)  
**Tiêu chuẩn tuân thủ**: Nghị định 13/2023/NĐ-CP & An toàn thông tin trường học  

---

## 1. Mục tiêu và Chỉ số (RTO / RPO)
- **RPO (Recovery Point Objective)**: Tối đa 24 giờ đối với dữ liệu thông thường; tối đa 1 giờ đối với giao dịch & nhật ký kiểm toán.
- **RTO (Recovery Time Objective)**: Tối đa 2 giờ để khôi phục toàn bộ dịch vụ sau sự cố.

---

## 2. Các Tầng Sao Lưu (Multi-Tier Backup Strategy)

### Tầng 1: Tự động bởi Supabase (Daily Backup)
- Supabase tự động sao lưu định kỳ hàng ngày (Daily backups) lưu giữ tại hạ tầng AWS `ap-southeast-1` (Singapore).
- Đối với gói Pro/Enterprise: Hỗ trợ Point-in-time Recovery (PITR) cho phép khôi phục về từng giây trong vòng 7-30 ngày.

### Tầng 2: Sao lưu Thủ công qua PostgreSQL Dump (CLI)
Quản trị viên hạ tầng có thể xuất bản sao lưu đầy đủ bằng `pg_dump`:
```bash
# 1. Xuất toàn bộ schema và dữ liệu (loại trừ các thông tin bảo mật Supabase nội bộ)
pg_dump -h db.ymitxuvpclufooypltqo.supabase.co -U postgres -d postgres -F c -b -v -f "backup_ntsell_$(date +%Y%m%d_%H%M%S).dump"

# 2. Xuất riêng dữ liệu bảng quan trọng dưới dạng SQL plaintext
pg_dump -h db.ymitxuvpclufooypltqo.supabase.co -U postgres -d postgres \
  -t profiles -t products -t messages -t audit_logs -t user_sessions \
  --data-only > "ntsell_data_$(date +%Y%m%d).sql"
```

### Tầng 3: Tự động Sao lưu về Google Drive (In-App Admin Panel)
- Tích hợp sẵn trong trang Quản Trị Viên (`AdminPanel` > Tab **Quản Lý Lưu Trữ**).
- Dữ liệu được trích xuất từ Supabase & LocalStorage, định dạng JSON có cấu trúc:
  - Danh sách hồ sơ (`profiles`)
  - Danh sách sản phẩm (`products`)
  - Danh sách tin nhắn trao đổi (`messages`)
  - Báo cáo tranh chấp (`disputes`)
  - Yêu cầu xác thực tài khoản (`verification_requests`)
- Được gửi tự động về Google Drive qua Google Apps Script Webhook hoặc Google Drive API v3 (OAuth 2.0).

---

## 3. Quy Trình Phục Hồi Dữ Liệu (Restoration Procedure)

### Trường hợp 1: Phục hồi từ bản dump CLI
```bash
# Khôi phục dữ liệu vào cơ sở dữ liệu mới hoặc sạch
pg_restore -h db.ymitxuvpclufooypltqo.supabase.co -U postgres -d postgres -v -c "backup_ntsell_YYYYMMDD_HHMMSS.dump"
```

### Trường hợp 2: Khôi phục qua Supabase Studio
1. Truy cập Supabase Dashboard (https://supabase.com/dashboard/project/ymitxuvpclufooypltqo).
2. Điều hướng tới mục **Database** > **Backups**.
3. Chọn mốc thời gian muốn phục hồi và bấm **Restore backup**.

### Trường hợp 3: Khôi phục từ JSON Google Drive
1. Tải tệp sao lưu JSON từ thư mục Google Drive của Admin.
2. Kiểm tra tính toàn vẹn của tệp JSON.
3. Trong SQL Editor của Supabase hoặc qua script, chạy lệnh upsert dữ liệu vào các bảng tương ứng.

---

## 4. Bảo Mật Bản Sao Lưu
- Mọi bản sao lưu xuất ra khỏi hạ tầng đều phải được mã hóa bằng AES-256 hoặc lưu trên tài khoản lưu trữ có bật xác thực 2 bước (2FA).
- Dữ liệu nhạy cảm (họ tên học sinh, lớp, số điện thoại) trong bảng `profiles` và `user_private_data` đã được mã hóa AES-GCM 256-bit trước khi lưu trữ.
- Không chia sẻ các tệp backup cho người không có thẩm quyền.
