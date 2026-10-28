import type { RealtimeFloodEvent } from '@/types/RealtimeFloodEvent';
import type { Station } from '@/types/Station';

/** Tạo 1 cảnh báo (cho dải đỏ, thông báo, màn Cảnh báo) từ trạm vừa tăng mức ngập. */
export function toFloodAlertEvent(station: Station): RealtimeFloodEvent {
  const now = new Date().toISOString();
  return {
    nodeId: station.nodeId,
    stationName: station.name,
    waterLevelCm: station.waterLevelCm ?? 0,
    thresholdCm: station.thresholdCm,
    level: station.floodLevel,
    floodRadiusM: station.floodRadiusM,
    timestamp: station.latest?.timestamp ?? station.lastSeenAt ?? now,
    receivedAt: now,
  };
}
