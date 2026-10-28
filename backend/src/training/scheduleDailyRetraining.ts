import { msUntilNextVietnamTime } from './msUntilNextVietnamTime.js';
import { trainAllNodes } from './trainAllNodes.js';

/**
 * TỰ HỌC LẠI MỖI NGÀY vào giờ `timeText` ("00:30" = 0 giờ 30 đêm, giờ Việt Nam).
 * Học xong lượt này mới hẹn lượt sau, nên không bao giờ 2 lượt chạy chồng nhau.
 * Trả về hàm hủy lịch (gọi khi tắt backend).
 */
export function scheduleDailyRetraining(timeText: string): () => void {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeText);
  const hour = match ? Number(match[1]) : NaN;
  const minute = match ? Number(match[2]) : NaN;
  if (!(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59)) {
    throw new Error(`MODEL_RETRAIN_TIME phải có dạng HH:MM (vd 00:30), đang là "${timeText}"`);
  }

  let timer: NodeJS.Timeout | null = null;
  const scheduleNext = () => {
    const delay = msUntilNextVietnamTime(hour, minute, new Date());
    timer = setTimeout(() => {
      trainAllNodes('auto')
        .catch((error: unknown) => console.error('[train] Lỗi khi tự học lại:', error))
        .finally(scheduleNext);
    }, delay);
    const totalMinutes = Math.round(delay / 60_000);
    const hoursLeft = Math.floor(totalMinutes / 60);
    const minutesLeft = totalMinutes % 60;
    console.log(`[train] Tự học lại công thức mỗi ngày lúc ${timeText} (giờ VN), lần tới sau ${hoursLeft} giờ ${minutesLeft} phút`);
  };
  scheduleNext();
  return () => {
    if (timer) clearTimeout(timer);
  };
}
