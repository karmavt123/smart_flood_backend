import type { RouteCheckResult, RouteFloodPoint, RouteStats } from '@/types/RouteCheckResult';
import { toNumberOrNull } from '@/utils/toNumberOrNull';

import { toFloodLevel } from './toFloodLevel';
import { toLatLngList } from './toLatLngList';

function toStats(raw: any): RouteStats {
  return {
    distanceLabel: typeof raw?.distanceLabel === 'string' ? raw.distanceLabel : null,
    durationLabel: typeof raw?.durationLabel === 'string' ? raw.durationLabel : null,
    riskLevel: toFloodLevel(raw?.riskLevel),
  };
}

function toFloodPoint(raw: any): RouteFloodPoint {
  return {
    nodeId: String(raw?.nodeId ?? ''),
    name: String(raw?.name ?? raw?.nodeId ?? ''),
    position: { latitude: Number(raw?.position?.latitude), longitude: Number(raw?.position?.longitude) },
    level: toFloodLevel(raw?.level),
    waterLevelCm: toNumberOrNull(raw?.waterLevelCm) ?? 0,
    radiusM: toNumberOrNull(raw?.radiusM) ?? 0,
    distanceToRouteM: toNumberOrNull(raw?.distanceToRouteM) ?? 0,
  };
}

/** Chuyển JSON của POST /api/v1/route/check sang RouteCheckResult (kiểm tra kiểu từng trường cho chắc). */
export function toRouteCheckResult(raw: any): RouteCheckResult {
  return {
    message: String(raw?.message ?? ''),
    riskLevel: toFloodLevel(raw?.riskLevel),
    safeRouteFound: raw?.safeRouteFound === true,
    endpointBlocked: raw?.endpointBlocked === true,
    routeEngineOk: raw?.routeEngineOk !== false,
    directRoute: toLatLngList(raw?.directRoute),
    suggestedRoute: toLatLngList(raw?.suggestedRoute),
    floodPoints: (Array.isArray(raw?.floodPoints) ? raw.floodPoints : []).map(toFloodPoint),
    directStats: toStats(raw?.directStats),
    suggestedStats: toStats(raw?.suggestedStats),
  };
}
