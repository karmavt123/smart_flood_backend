import type { FloodLevel } from './FloodLevel.js';
import type { LatLng } from './LatLng.js';

/** 1 đoạn đường nằm trong vùng ảnh hưởng của 1 node đang ngập — app tô màu theo `level`. */
export interface FloodedRoad {
  /** Node gây ra vùng ngập này. */
  nodeId: string;
  level: FloodLevel;
  /** Tên đường trên OpenStreetMap, vd "Nguyễn Hữu Cảnh"; null nếu đường không có tên (hẻm). */
  roadName: string | null;
  path: LatLng[];
}
