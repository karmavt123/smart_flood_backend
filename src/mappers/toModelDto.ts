import { toIsoString } from '../geo/toIsoString.js';
import type { NodeModelRecord } from '../types/NodeModelRecord.js';
import type { ModelDto } from '../types/StationDto.js';

/** Đổi 1 dòng bảng node_models sang dạng gửi cho app. */
export function toModelDto(record: NodeModelRecord): ModelDto {
  return {
    version: record.version,
    trainedAt: toIsoString(record.trained_at),
    samples: record.samples,
    horizonMinutes: record.horizon_minutes,
    intercept: record.intercept,
    coefficients: record.coefficients,
    maeCm: record.mae_cm,
    rmseCm: record.rmse_cm,
    r2: record.r2,
    firstSeenAt: toIsoString(record.first_seen_at) ?? '',
  };
}
