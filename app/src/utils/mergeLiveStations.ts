import type { Station } from '@/types/Station';

/**
 * GỘP DỮ LIỆU REALTIME vào danh sách trạm tải từ máy chủ:
 *  - trạm nào có bản realtime MỚI HƠN (lastSeenAt sau) thì dùng bản realtime;
 *  - bản realtime cũ hơn hoặc bằng thì giữ bản vừa tải (máy chủ vừa tính lại trạng thái kết nối);
 *  - trạm mới xuất hiện qua realtime (chưa có trong danh sách) thì thêm vào cuối.
 * Gói cũ đến muộn không ghi đè dữ liệu mới (FR-06).
 */
export function mergeLiveStations(list: Station[], live: Record<string, Station>): Station[] {
  const time = (s: Station) => (s.lastSeenAt ? Date.parse(s.lastSeenAt) || 0 : 0);
  const merged = list.map((station) => {
    const update = live[station.nodeId];
    return update && time(update) > time(station) ? update : station;
  });
  const known = new Set(list.map((s) => s.nodeId));
  for (const station of Object.values(live)) if (!known.has(station.nodeId)) merged.push(station);
  return merged;
}
