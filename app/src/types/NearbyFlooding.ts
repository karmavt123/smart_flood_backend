import type { FloodedRoad } from './FloodedRoad';
import type { FloodLevel } from './FloodLevel';
import type { LatLng } from './LatLng';
import type { Station } from './Station';

/**
 * TÌNH HÌNH NGẬP QUANH 1 VỊ TRÍ (màn Bản đồ — "Quanh bạn"), máy chủ trả từ GET /api/v1/nearby:
 *   flooding     = có trạm đang ngập trong bán kính
 *   clear        = không trạm nào ngập VÀ có trạm gần đó đang hoạt động
 *   insufficient = không có trạm nào đang hoạt động gần đó → KHÔNG được kết luận là an toàn
 */
export interface NearbyFlooding {
  center: LatLng;
  radiusM: number;
  state: 'flooding' | 'clear' | 'insufficient';
  worstLevel: FloodLevel;
  counts: { stationsInside: number; online: number; flooding: number; stale: number };
  /** Các trạm trong bán kính, gần nhất trước, kèm khoảng cách (m). */
  stations: { station: Station; distanceM: number }[];
  floodedRoads: FloodedRoad[];
  /** ok = đủ hình dạng đường; partial/unavailable = máy chủ chưa lấy được → app vẽ vòng tròn thay; none = không có chỗ ngập. */
  roadsStatus: 'ok' | 'partial' | 'unavailable' | 'none';
}
