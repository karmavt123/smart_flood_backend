import { ROUTE_SAFETY_BUFFER_M } from '../config/floodRules.js';
import { isFloodingLevel } from '../domain/isFloodingLevel.js';
import type { StationDto } from '../types/StationDto.js';
import type { FloodZone } from './FloodZone.js';

/** Các vùng ngập ĐANG CÓ HIỆU LỰC: node có vị trí, dữ liệu còn mới, từ mức Cảnh báo trở lên. */
export function findActiveFloodZones(stations: StationDto[]): FloodZone[] {
  return stations
    .filter((s) => s.latitude !== null && s.longitude !== null && s.isFloodInfoUsable && isFloodingLevel(s.floodLevel))
    .map((station) => ({ station, radiusM: station.influenceRadiusM + ROUTE_SAFETY_BUFFER_M }));
}
