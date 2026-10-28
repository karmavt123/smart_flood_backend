import { toIsoString } from '../geo/toIsoString.js';
import type { NodeModelRecord } from '../types/NodeModelRecord.js';

/**
 * NỘI DUNG TIN NHẮN GỬI HỆ SỐ XUỐNG TRẠM (topic smartflood/nodes/<id>/model), ví dụ:
 *   { "version": 2, "horizon_min": 5, "intercept": 1.2,
 *     "coef": { "H": 0.97, "V": 4.9, "R": 0.03, "S": 2.1 },
 *     "trained_at": "2026-10-29T17:30:00.000Z", "samples": 146, "mae_mm": 3.4 }
 * Trạm tính: Ĥ(mm) = intercept + H·water_level_mm + V·rise_rate_mm_min + R·rain_mm + S·tide_m.
 */
export function toModelMessage(model: NodeModelRecord) {
  return {
    version: model.version,
    horizon_min: model.horizon_minutes,
    intercept: model.intercept,
    coef: model.coefficients,
    trained_at: toIsoString(model.trained_at),
    samples: model.samples,
    mae_mm: model.mae_cm === null ? null : Math.round(model.mae_cm * 10 * 100) / 100,
  };
}
