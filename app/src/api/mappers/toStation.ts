import type { ConnectionState } from '@/types/ConnectionState';
import type { Station } from '@/types/Station';
import { toNumberOrNull } from '@/utils/toNumberOrNull';

import { toFloodLevel } from './toFloodLevel';
import { toSensorReading } from './toSensorReading';
import { toStationModel } from './toStationModel';

const CONNECTION_STATES: ConnectionState[] = ['online', 'slow', 'offline', 'nodata'];

/**
 * Chuyển 1 trạm trong JSON máy chủ (GET /api/v1/stations, sự kiện realtime "station:update")
 * sang kiểu Station của app. Tên trường máy chủ: nodeId, name, latitude, longitude, thresholds,
 * connectionState, lastSeenAt, floodLevel, influenceRadiusM, predictedLevel, latest, model.
 */
export function toStation(raw: any): Station | null {
  if (!raw || typeof raw.nodeId !== 'string') return null;
  const thresholds = {
    warningCm: toNumberOrNull(raw.thresholds?.warningCm) ?? 10,
    dangerCm: toNumberOrNull(raw.thresholds?.dangerCm) ?? 25,
    criticalCm: toNumberOrNull(raw.thresholds?.criticalCm) ?? 40,
  };
  const latest = raw.latest ? toSensorReading(raw.latest, raw.nodeId) : null;
  return {
    nodeId: raw.nodeId,
    name: typeof raw.name === 'string' && raw.name ? raw.name : raw.nodeId,
    address: typeof raw.address === 'string' ? raw.address : '',
    latitude: toNumberOrNull(raw.latitude),
    longitude: toNumberOrNull(raw.longitude),
    thresholds,
    thresholdCm: thresholds.dangerCm,
    // Độ sâu âm nhỏ do nhiễu cảm biến → hiện là 0.
    waterLevelCm: latest?.waterLevelCm === null || latest?.waterLevelCm === undefined ? null : Math.max(0, latest.waterLevelCm),
    floodLevel: toFloodLevel(raw.floodLevel),
    predictedLevel: toFloodLevel(raw.predictedLevel),
    lastSeenAt: typeof raw.lastSeenAt === 'string' ? raw.lastSeenAt : null,
    connectionState: CONNECTION_STATES.includes(raw.connectionState) ? raw.connectionState : 'nodata',
    floodRadiusM: toNumberOrNull(raw.influenceRadiusM) ?? 0,
    latest,
    model: raw.model ? toStationModel(raw.model) : null,
  };
}
