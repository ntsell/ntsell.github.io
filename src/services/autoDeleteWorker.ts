// ====================================================================
// STORAGE SCRIPT: AUTO-DELETE VIDEOS CRON WORKER
// Rà soát và tự động dọn dẹp video Google Drive sau 6 tháng
// ====================================================================

/**
 * Hàm này có thể chạy định kỳ qua Supabase pg_cron, GitHub Actions, hoặc Node cron.
 * Điều kiện xóa an toàn:
 * 1. Giao dịch đã hoàn tất (status = 'completed')
 * 2. Thời gian hoàn tất > 180 ngày (6 tháng)
 * 3. KHÔNG CÓ tranh chấp nào được ghi nhận trong bảng disputes
 */
export async function runAutoDeleteVideosJob(transactions: any[], disputes: any[]) {
  console.log('[CRON] Khởi động rà soát video sau 6 tháng...');
  
  const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
  let cleanedCount = 0;
  let retainedCount = 0;

  for (const trans of transactions) {
    if (trans.status === 'completed' && trans.completedAt) {
      const completedTime = new Date(trans.completedAt).getTime();
      const hasDispute = disputes.some(d => d.transactionId === trans.id);

      if (hasDispute) {
        console.log(`[RETAIN] Giữ lại video giao dịch #${trans.id} do có lịch sử tranh chấp/khiếu nại.`);
        retainedCount++;
        continue;
      }

      if (completedTime < sixMonthsAgo) {
        console.log(`[DELETE] Video giao dịch #${trans.id} đã hoàn tất trên 6 tháng. Đang giải phóng Google Drive storage...`);
        trans.videoCleanupStatus = 'deleted_after_6m';
        trans.sellerProofVideoUrl = null;
        trans.buyerProofVideoUrl = null;
        cleanedCount++;
      }
    }
  }

  return {
    status: 'success',
    scanned: transactions.length,
    cleanedCount,
    retainedCount,
    timestamp: new Date().toISOString()
  };
}
