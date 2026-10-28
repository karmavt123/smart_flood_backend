import { ONLINE_WITHIN_INTERVALS, SLOW_WITHIN_INTERVALS } from '../config/floodRules.js';
import type { ConnectionState } from '../types/ConnectionState.js';

/**
 * TÍNH TRẠNG THÁI KẾT NỐI từ lần cuối có dữ liệu và chu kỳ gửi của node.
 * Ví dụ node gửi 5 phút/lần: dữ liệu 7 phút trước → online; 20 phút → slow; 1 giờ → offline.
 */
export function getConnectionState(lastSeenAt: Date | null, expectedIntervalSec: number, now: Date): ConnectionState {
  if (!lastSeenAt) return 'nodata';
  const ageSec = (now.getTime() - lastSeenAt.getTime()) / 1000;
  if (ageSec <= expectedIntervalSec * ONLINE_WITHIN_INTERVALS) return 'online';
  if (ageSec <= expectedIntervalSec * SLOW_WITHIN_INTERVALS) return 'slow';
  return 'offline';
}
