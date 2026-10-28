import type { FloodedRoad } from './FloodedRoad.js';
import type { FloodLevel } from './FloodLevel.js';
import type { LatLng } from './LatLng.js';
import type { StationDto } from './StationDto.js';

/**
 * KẾT QUẢ "QUANH BẠN" (GET /api/v1/nearby):
 *   state = flooding     → có node đang ngập trong bán kính
 *         = clear        → không node nào ngập VÀ có ít nhất 1 node gần đó đang hoạt động
 *         = insufficient → không có node nào đang hoạt động gần đó → KHÔNG kết luận là an toàn
 */
export interface NearbyResult {
  center: LatLng;
  radiusM: number;
  generatedAt: string;
  state: 'flooding' | 'clear' | 'insufficient';
  /** Mức ngập nặng nhất trong bán kính. */
  worstLevel: FloodLevel;
  counts: { stationsInside: number; online: number; flooding: number; stale: number };
  /** Các trạm trong bán kính, gần nhất trước. */
  stations: (StationDto & { distanceM: number })[];
  /** Các đoạn đường bị ngập để app tô màu. */
  floodedRoads: FloodedRoad[];
  /** ok = đủ dữ liệu đường; partial/unavailable = Overpass lỗi (app vẽ vòng tròn thay); none = không có chỗ ngập. */
  roadsStatus: 'ok' | 'partial' | 'unavailable' | 'none';
}
