import { DEVICE_CLOCK_MAX_AHEAD_SEC } from '../config/floodRules.js';
import { IngestRejection } from './IngestRejection.js';
import { parseTimeValue } from './parseTimeValue.js';

/** Năm sớm nhất được coi là giờ thật (đồng hồ ESP32 chưa chỉnh thường về năm 1970 hoặc 2000). */
const EARLIEST_VALID = Date.UTC(2024, 0, 1);

export interface ResolvedTime {
  measuredAt: Date;
  timeSource: 'device' | 'server';
  /** Có giá trị khi giờ thiết bị bị bỏ qua — lưu lại vào extra để bên IoT kiểm tra đồng hồ. */
  rejectedDeviceTime: string | number | null;
}

/**
 * CHỌN THỜI ĐIỂM ĐO của 1 tin nhắn.
 *   - Tin nhắn trực tiếp (MQTT): giờ thiết bị hợp lệ thì dùng; thiếu hoặc sai (chạy nhanh quá 5 phút,
 *     năm 1970...) thì dùng giờ máy chủ nhận — không bỏ tin nhắn.
 *   - Nhập dữ liệu cũ (import): BẮT BUỘC có giờ đo đúng, sai thì từ chối (không thì lẫn lộn thời gian).
 */
export function resolveMeasuredAt(
  raw: string | number | null | undefined,
  receivedAt: Date,
  mustHaveDeviceTime: boolean,
): ResolvedTime {
  const fallback = (rejected: string | number | null): ResolvedTime => {
    if (mustHaveDeviceTime) {
      throw new IngestRejection(
        rejected === null
          ? 'measured_at: thiếu thời điểm đo (bắt buộc khi nhập dữ liệu)'
          : `measured_at: thời điểm đo không hợp lệ (${String(rejected)})`,
      );
    }
    return { measuredAt: receivedAt, timeSource: 'server', rejectedDeviceTime: rejected };
  };

  if (raw === null || raw === undefined) return fallback(null);
  const parsed = parseTimeValue(raw);
  if (!parsed) return fallback(raw);
  const aheadSec = (parsed.getTime() - receivedAt.getTime()) / 1000;
  if (aheadSec > DEVICE_CLOCK_MAX_AHEAD_SEC || parsed.getTime() < EARLIEST_VALID) return fallback(raw);
  return { measuredAt: parsed, timeSource: 'device', rejectedDeviceTime: null };
}
