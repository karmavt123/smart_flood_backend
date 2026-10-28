import { toIsoString } from '../geo/toIsoString.js';
import type { TrainingRunRecord } from '../types/TrainingRunRecord.js';

/** Đổi 1 dòng nhật ký học sang dạng gửi cho trang admin. */
export function toTrainingRunDto(record: TrainingRunRecord) {
  return {
    id: record.id,
    nodeId: record.node_id,
    startedAt: toIsoString(record.started_at),
    trigger: record.trigger,
    status: record.status,
    reason: record.reason,
    pairsTotal: record.pairs_total,
    samplesUsed: record.samples_used,
    baseVersion: record.base_version,
    newVersion: record.new_version,
    maeNewCm: record.mae_new_cm,
    maeOldCm: record.mae_old_cm,
    maeBaselineCm: record.mae_baseline_cm,
  };
}
