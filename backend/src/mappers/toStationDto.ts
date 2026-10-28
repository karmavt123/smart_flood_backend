import { getConnectionState } from '../domain/getConnectionState.js';
import { getFloodLevel } from '../domain/getFloodLevel.js';
import { getInfluenceRadius } from '../domain/getInfluenceRadius.js';
import { isFloodInfoUsable } from '../domain/isFloodInfoUsable.js';
import { toIsoString } from '../geo/toIsoString.js';
import type { StationRow } from '../repositories/nodes/listStationRows.js';
import type { StationDto } from '../types/StationDto.js';
import { toModelDto } from './toModelDto.js';
import { toReadingDto } from './toReadingDto.js';

/** Thời điểm muộn hơn trong 2 thời điểm (bỏ qua null). */
function later(a: string | null, b: string | null): Date | null {
  const times = [a, b].filter((t): t is string => t !== null).map((t) => new Date(t).getTime());
  return times.length ? new Date(Math.max(...times)) : null;
}

/**
 * GHÉP thông tin node + lần đo mới nhất + công thức mới nhất thành 1 "trạm" gửi cho app,
 * đồng thời TÍNH trạng thái kết nối, mức ngập, bán kính vùng ảnh hưởng tại thời điểm `now`.
 */
export function toStationDto(row: StationRow, now: Date): StationDto {
  const { node, latest, model } = row;
  const lastSeen = later(toIsoString(node.last_message_at), latest ? toIsoString(latest.measured_at) : null);
  const connectionState = getConnectionState(lastSeen, node.expected_interval_sec, now);
  // Độ sâu âm (nhiễu cảm biến) coi như 0 khi xếp mức.
  const floodLevel = getFloodLevel(latest ? Math.max(0, latest.flood_depth_cm) : null, node);
  const usable = latest !== null && isFloodInfoUsable(connectionState);

  return {
    nodeId: node.id,
    name: node.name,
    address: node.address,
    latitude: node.latitude,
    longitude: node.longitude,
    thresholds: { warningCm: node.warning_cm, dangerCm: node.danger_cm, criticalCm: node.critical_cm },
    expectedIntervalSec: node.expected_interval_sec,
    isActive: node.is_active,
    connectionState,
    lastSeenAt: lastSeen ? lastSeen.toISOString() : null,
    floodLevel,
    isFloodInfoUsable: usable,
    influenceRadiusM: getInfluenceRadius(floodLevel, usable),
    predictedLevel: getFloodLevel(latest?.predicted_depth_cm ?? null, node),
    latest: latest ? toReadingDto(latest) : null,
    model: model ? toModelDto(model) : null,
  };
}
