import type { FloodLevel } from './FloodLevel';
import type { LatLng } from './LatLng';

/** Một trạm ngập nằm gần tuyến đường. */
export interface RouteFloodPoint {
  nodeId: string;
  name: string;
  position: LatLng;
  level: FloodLevel;
  waterLevelCm: number;
  /** Bán kính vùng ngập + vùng đệm an toàn (m). */
  radiusM: number;
  /** Khoảng cách từ trạm tới tuyến (m). */
  distanceToRouteM: number;
}

/** Thông tin tóm tắt của một tuyến. */
export interface RouteStats {
  distanceLabel: string | null;
  durationLabel: string | null;
  riskLevel: FloodLevel;
}

/** Kết quả máy chủ trả về khi kiểm tra tuyến đường (POST /api/v1/route/check). */
export interface RouteCheckResult {
  /** Câu kết luận máy chủ viết sẵn. */
  message: string;
  /** Mức rủi ro của tuyến chính: normal = không đi gần vùng ngập nào. */
  riskLevel: FloodLevel;
  /** true = đã tìm được tuyến tránh tất cả vùng ngập đang hoạt động. */
  safeRouteFound: boolean;
  /** true = điểm đi hoặc điểm đến nằm ngay trong vùng ngập. */
  endpointBlocked: boolean;
  /** false = dịch vụ chỉ đường (OSRM) lỗi, máy chủ dùng đường thẳng dự phòng. */
  routeEngineOk: boolean;
  directRoute: LatLng[];
  suggestedRoute: LatLng[];
  /** Các trạm ngập gần tuyến chính. */
  floodPoints: RouteFloodPoint[];
  directStats: RouteStats;
  suggestedStats: RouteStats;
}
