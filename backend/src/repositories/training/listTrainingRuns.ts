import { db } from '../../db/sharedDatabase.js';
import type { TrainingRunRecord } from '../../types/TrainingRunRecord.js';

/** Nhật ký học gần nhất của 1 node (mới nhất trước). */
export async function listTrainingRuns(nodeId: string, limit: number): Promise<TrainingRunRecord[]> {
  return db().query<TrainingRunRecord>(
    `SELECT id::text AS id, node_id, started_at, trigger, status, reason, pairs_total, samples_used,
            base_version, new_version, mae_new_cm, mae_old_cm, mae_baseline_cm
     FROM model_training_runs WHERE node_id = $1 ORDER BY started_at DESC, id DESC LIMIT $2`,
    [nodeId, limit],
  );
}
