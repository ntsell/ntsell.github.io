import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import fs from 'fs'
import path from 'path'

// Simple local API plugin for Vite to share products across normal and incognito windows
function localApiPlugin() {
  const dbPath = path.resolve(import.meta.dirname, 'src/services/productsDatabase.json');
  
  // In-memory rate limiting map: ip -> { count, resetTime }
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 phút
  const MAX_REQUESTS_PER_WINDOW = 120; // Tối đa 120 req/phút/IP (thoải mái cho polling 2s mà chống được DoS/DDoS cào dữ liệu)
  const MAX_PAYLOAD_SIZE = 15 * 1024 * 1024; // Giới hạn kích thước payload tối đa 15MB chống tấn công làm cạn kiệt RAM

  return {
    name: 'local-api-server',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/api/products') {
          const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
          const now = Date.now();

          // 1. CHỐNG DOS/CÀO DỮ LIỆU BẰNG RATE LIMITING
          const record = rateLimitMap.get(clientIp);
          if (!record || now > record.resetTime) {
            rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
          } else {
            record.count += 1;
            if (record.count > MAX_REQUESTS_PER_WINDOW) {
              res.statusCode = 429;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Retry-After', '60');
              res.end(JSON.stringify({ error: 'Cảnh báo bảo mật: Quá nhiều yêu cầu (Rate limit exceeded). Vui lòng thử lại sau.' }));
              return;
            }
          }

          // 2. THIẾT LẬP BỘ HEADER BẢO MẬT CHUẨN OWASP (Security Headers)
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

          // 3. BẢO MẬT TRUY VẤN GET (Lấy danh sách sản phẩm)
          if (req.method === 'GET') {
            try {
              if (fs.existsSync(dbPath)) {
                const data = fs.readFileSync(dbPath, 'utf-8');
                res.end(data);
              } else {
                res.end(JSON.stringify([]));
              }
            } catch (e) {
              res.end(JSON.stringify([]));
            }
            return;
          }

          // 4. BẢO MẬT GỬI DỮ LIỆU POST (Chống CSRF, Overflow & Injection)
          if (req.method === 'POST') {
            // Kiểm tra Origin / Referer ngăn chặn tấn công giả mạo CSRF từ website lạ
            const origin = req.headers['origin'] || req.headers['referer'] || '';
            const host = req.headers['host'] || '';
            if (origin && !origin.includes(host) && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
              res.statusCode = 403;
              res.end(JSON.stringify({ error: 'Từ chối truy cập: Vi phạm chính sách xác thực nguồn gốc CORS/CSRF.' }));
              return;
            }

            let body = '';
            let receivedBytes = 0;
            let isAborted = false;

            req.on('data', (chunk: any) => {
              receivedBytes += chunk.length;
              // Chống tấn công Payload Size Overflow làm tràn RAM server
              if (receivedBytes > MAX_PAYLOAD_SIZE) {
                isAborted = true;
                req.destroy();
                res.statusCode = 413;
                res.end(JSON.stringify({ error: 'Dữ liệu tải lên quá lớn (Vượt quá giới hạn tối đa).' }));
                return;
              }
              body += chunk;
            });

            req.on('end', () => {
              if (isAborted) return;
              try {
                const parsed = JSON.parse(body);
                
                // Schema Validation: Bắt buộc định dạng là mảng sản phẩm
                if (!Array.isArray(parsed)) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Cấu trúc dữ liệu không hợp lệ.' }));
                  return;
                }

                // Chống Injection & Lọc các trường an toàn
                const sanitized = parsed.map((item: any) => {
                  // Đảm bảo không chứa script injection
                  const sanitizeStr = (str: any) => typeof str === 'string' ? str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') : '';
                  return {
                    id: String(item.id || ''),
                    sellerId: String(item.sellerId || ''),
                    sellerDisplayName: sanitizeStr(item.sellerDisplayName),
                    sellerTrustScore: Number(item.sellerTrustScore) || 100,
                    title: sanitizeStr(item.title),
                    model: sanitizeStr(item.model),
                    price: Number(item.price) || 0,
                    condition: sanitizeStr(item.condition),
                    description: sanitizeStr(item.description),
                    serialNumber: sanitizeStr(item.serialNumber),
                    maskedSerialNumber: sanitizeStr(item.maskedSerialNumber),
                    encryptedSerialNumber: sanitizeStr(item.encryptedSerialNumber),
                    snStatus: sanitizeStr(item.snStatus),
                    imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls.slice(0, 8) : [],
                    demoVideoUrl: item.demoVideoUrl ? String(item.demoVideoUrl) : undefined,
                    tradeLocation: sanitizeStr(item.tradeLocation),
                    status: sanitizeStr(item.status),
                    createdAt: String(item.createdAt || new Date().toISOString())
                  };
                });

                fs.writeFileSync(dbPath, JSON.stringify(sanitized, null, 2), 'utf-8');
                res.end(JSON.stringify({ success: true }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Lỗi máy chủ khi xử lý dữ liệu.' }));
              }
            });
            return;
          }

          // Chặn các phương thức HTTP nguy hiểm khác
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Phương thức không được hỗ trợ.' }));
          return;
        }

        // =========================================================
        // REALTIME CHAT API: /api/messages & /api/conversations
        // Đồng bộ tin nhắn & hội thoại tức thời giữa các tài khoản & trình duyệt
        // =========================================================
        if (req.url === '/api/conversations') {
          const convoDbPath = path.resolve(import.meta.dirname, 'src/services/conversationsDatabase.json');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

          if (req.method === 'GET') {
            try {
              if (fs.existsSync(convoDbPath)) {
                res.end(fs.readFileSync(convoDbPath, 'utf-8'));
              } else {
                res.end(JSON.stringify([]));
              }
            } catch (e) {
              res.end(JSON.stringify([]));
            }
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                if (!Array.isArray(parsed)) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Dữ liệu hội thoại không hợp lệ.' }));
                  return;
                }
                fs.writeFileSync(convoDbPath, JSON.stringify(parsed, null, 2), 'utf-8');
                res.end(JSON.stringify({ success: true }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Phương thức không hỗ trợ.' }));
          return;
        }

        if (req.url === '/api/messages') {
          const msgDbPath = path.resolve(import.meta.dirname, 'src/services/messagesDatabase.json');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

          if (req.method === 'GET') {
            try {
              if (fs.existsSync(msgDbPath)) {
                res.end(fs.readFileSync(msgDbPath, 'utf-8'));
              } else {
                res.end(JSON.stringify([]));
              }
            } catch (e) {
              res.end(JSON.stringify([]));
            }
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                if (!Array.isArray(parsed)) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Dữ liệu tin nhắn không hợp lệ.' }));
                  return;
                }
                fs.writeFileSync(msgDbPath, JSON.stringify(parsed, null, 2), 'utf-8');
                res.end(JSON.stringify({ success: true }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Phương thức không hỗ trợ.' }));
          return;
        }

        // =========================================================
        // NOTIFICATIONS API: /api/notifications
        // Đồng bộ thông báo hệ thống, tin nhắn mới, admin approve/reject
        // =========================================================
        if (req.url === '/api/notifications') {
          const notifDbPath = path.resolve(import.meta.dirname, 'src/services/notificationsDatabase.json');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

          if (req.method === 'GET') {
            try {
              if (fs.existsSync(notifDbPath)) {
                res.end(fs.readFileSync(notifDbPath, 'utf-8'));
              } else {
                res.end(JSON.stringify([]));
              }
            } catch (e) {
              res.end(JSON.stringify([]));
            }
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                if (!Array.isArray(parsed)) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Dữ liệu thông báo không hợp lệ.' }));
                  return;
                }
                fs.writeFileSync(notifDbPath, JSON.stringify(parsed, null, 2), 'utf-8');
                res.end(JSON.stringify({ success: true }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Phương thức không hỗ trợ.' }));
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    localApiPlugin()
  ],
  base: './', // Cấu hình chuẩn tương thích 100% với GitHub Pages
})
