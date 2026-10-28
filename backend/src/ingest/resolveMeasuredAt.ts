import { DEVICE_CLOCK_MAX_AHEAD_SEC, DEVICE_CLOCK_ONLY_MAX_BEHIND_SEC } from '../config/floodRules.js';
import { IngestRejection } from './IngestRejection.js';
import { type ClockTime, parseClockTime } from './parseClockTime.js';
import { parseDateText } from './parseDateText.js';
import { parseTimeValue } from './parseTimeValue.js';
import { vietnamDateOf, vietnamDateTime } from './vietnamTime.js';

/** Năm sớm nhất được coi là giờ thật (đồng hồ ESP32 chưa chỉnh thường về năm 1970 hoặc 2000). */
const EARLIEST_VALID = Date.UTC(2024, 0, 1);
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Các trường thời gian node có thể gửi (kiểu mới: time + date; kiểu cũ: measured_at). */
export interface DeviceTimeFields {
  time: string | number | null | undefined;
  date: string | null | undefined;
  measuredAt: string | number | null | undefined;
}

export interface ResolvedTime {
  measuredAt: Date;
  timeSource: 'device' | 'server';
  /** Ghi thêm vào cột extra để sau này kiểm tra đồng hồ node (chuỗi giờ gốc, giờ bị bỏ qua...). */
  notes: Record<string, unknown>;
}

/**
 * CHỌN THỜI ĐIỂM ĐO của 1 tin nhắn.
 *   - Node gửi chỉ có GIỜ ("14:05:30"): ghép với ngày hôm nay theo giờ Việt Nam
 *     (gần nửa đêm thì lùi về hôm qua cho đúng). Lệch giờ máy chủ quá nhiều → dùng giờ máy chủ.
 *   - Node gửi đủ ngày giờ (date + time, hoặc measured_at kiểu cũ): dùng luôn.
 *   - Tin nhắn trực tiếp (MQTT): giờ thiết bị thiếu hoặc sai thì dùng giờ máy chủ nhận — KHÔNG bỏ tin nhắn.
 *   - Nhập dữ liệu cũ (import): BẮT BUỘC có ngày + giờ đúng, sai thì từ chối (không thì lẫn lộn thời gian).
 */
export function resolveMeasuredAt(fields: DeviceTimeFields, receivedAt: Date, mustHaveDeviceTime: boolean): ResolvedTime {
  const hasTime = fields.time !== null && fields.time !== undefined;
  const hasMeasuredAt = fields.measuredAt !== null && fields.measuredAt !== undefined;
  if (hasTime && hasMeasuredAt) throw new IngestRejection('Chỉ gửi 1 trong 2 trường thời gian: time hoặc measured_at');

  const raw = hasTime ? fields.time! : hasMeasuredAt ? fields.measuredAt! : null;
  const notes: Record<string, unknown> = {};
  if (hasTime) notes.device_time = fields.time;
  if (fields.date) notes.device_date = fields.date;

  const field = hasMeasuredAt ? 'measured_at' : 'time';
  const fallback = (reason: string | null): ResolvedTime => {
    if (mustHaveDeviceTime) {
      throw new IngestRejection(
        reason ??
          (raw === null
            ? 'time: thiếu thời điểm đo (bắt buộc khi nhập dữ liệu — gửi date + time, hoặc measured_at)'
            : `${field}: thời điểm đo không hợp lệ (${String(raw)})`),
      );
    }
    if (raw !== null) {
      delete notes.device_time;
      notes.device_time_rejected = raw; // để bên IoT biết đồng hồ node đang sai
    }
    return { measuredAt: receivedAt, timeSource: 'server', notes };
  };

  if (raw === null) return fallback(null);

  // Kiểu mới: chỉ có giờ (có thể kèm date)
  const clock = typeof raw === 'string' ? parseClockTime(raw) : null;
  if (clock) {
    if (fields.date) {
      const day = parseDateText(fields.date);
      if (!day) return fallback(`date: ngày không hợp lệ (${fields.date}) — dùng dạng "2026-10-26" hoặc "26/10/2026"`);
      return checkDeviceTime(vietnamDateTime(day, clock), receivedAt, notes, fallback);
    }
    if (mustHaveDeviceTime) {
      throw new IngestRejection(`time: "${String(raw)}" chỉ có giờ — khi nhập dữ liệu cũ phải gửi thêm date (vd "2026-10-26")`);
    }
    const guessed = attachVietnamToday(clock, receivedAt);
    const behindSec = (receivedAt.getTime() - guessed.getTime()) / 1000;
    if (behindSec > DEVICE_CLOCK_ONLY_MAX_BEHIND_SEC) return fallback(null);
    notes.date_from_server = true;
    return checkDeviceTime(guessed, receivedAt, notes, fallback);
  }

  // Kiểu cũ hoặc time là chuỗi ISO / số Unix
  const parsed = parseTimeValue(raw);
  if (!parsed) return fallback(null);
  return checkDeviceTime(parsed, receivedAt, notes, fallback);
}

/** Giờ thiết bị chạy nhanh quá 5 phút hoặc trước năm 2024 → coi là sai. */
function checkDeviceTime(
  measuredAt: Date,
  receivedAt: Date,
  notes: Record<string, unknown>,
  fallback: (reason: string | null) => ResolvedTime,
): ResolvedTime {
  const aheadSec = (measuredAt.getTime() - receivedAt.getTime()) / 1000;
  const shown = measuredAt.toLocaleString('vi-VN', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
  if (aheadSec > DEVICE_CLOCK_MAX_AHEAD_SEC) return fallback(`thời điểm đo ${shown} ở TƯƠNG LAI so với giờ máy chủ`);
  if (measuredAt.getTime() < EARLIEST_VALID) return fallback(`thời điểm đo ${shown} trước năm 2024 — đồng hồ node chưa chỉnh giờ?`);
  return { measuredAt, timeSource: 'device', notes };
}

/**
 * Ghép giờ node gửi với NGÀY HÔM NAY (giờ VN) lúc máy chủ nhận.
 * Vd node đo lúc 23:59:58, tới máy chủ lúc 00:00:03 hôm sau → ghép "hôm nay" sẽ ra gần 24 giờ sau,
 * nên lùi lại 1 ngày.
 */
function attachVietnamToday(clock: ClockTime, receivedAt: Date): Date {
  const today = vietnamDateTime(vietnamDateOf(receivedAt), clock);
  const aheadSec = (today.getTime() - receivedAt.getTime()) / 1000;
  return aheadSec > DEVICE_CLOCK_MAX_AHEAD_SEC ? new Date(today.getTime() - ONE_DAY_MS) : today;
}
