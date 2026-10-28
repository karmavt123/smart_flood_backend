import type { FloodLevel } from './FloodLevel.js';
import type { LatLng } from './LatLng.js';

/** 1 vùng ngập nằm sát tuyến đường. */
export interface RouteFloodPoint {
  nodeId: string;
  name: string;
  position: LatLng;
  level: FloodLevel;
  waterLevelCm: number;
  /** Bán kính vùng ảnh hưởng + vùng đệm an toàn (m). */
  radiusM: number;
  /** Khoảng cách từ node tới tuyến (m). */
  distanceToRouteM: number;
}

export interface RouteStats {
  distanceLabel: string | null;
  durationLabel: string | null;
  riskLevel: FloodLevel;
}

/** Kết quả kiểm tra tuyến (POST /api/v1/route/check) — cùng dạng với kiểu RouteCheckResult của app. */
export interface RouteCheckResult {
  message: string;
  /** Mức ngập nặng nhất trên tuyến ngắn nhất; normal = không đi qua vùng ngập nào. */
  riskLevel: FloodLevel;
  /** true = đã tìm được tuyến tránh tất cả vùng ngập. */
  safeRouteFound: boolean;
  /** true = điểm đi hoặc điểm đến nằm ngay trong vùng ngập. */
  endpointBlocked: boolean;
  /** false = dịch vụ chỉ đường lỗi, tạm dùng đường thẳng. */
  routeEngineOk: boolean;
  directRoute: LatLng[];
  suggestedRoute: LatLng[];
  floodPoints: RouteFloodPoint[];
  directStats: RouteStats;
  suggestedStats: RouteStats;
}
