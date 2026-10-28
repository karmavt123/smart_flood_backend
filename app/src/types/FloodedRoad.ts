import type { FloodLevel } from './FloodLevel';
import type { LatLng } from './LatLng';

/**
 * MỘT ĐOẠN ĐƯỜNG BỊ NGẬP (ước lượng): đoạn đường nằm trong vùng ảnh hưởng của 1 trạm đang ngập.
 * Máy chủ lấy hình dạng đường từ OpenStreetMap; app tô màu theo mức ngập của trạm.
 */
export interface FloodedRoad {
  nodeId: string;
  level: FloodLevel;
  /** Tên đường, vd "Nguyễn Hữu Cảnh"; null nếu đường không có tên (hẻm). */
  roadName: string | null;
  path: LatLng[];
}
