import { db } from '../../db/sharedDatabase.js';
import type { TrainingRunRecord } from '../../types/TrainingRunRecord.js';

export type NewTrainingRun = Omit<TrainingRunRecord, 'id' | 'started_at'> & { started_at: Date };

/** Ghi 1 dòng nhật ký học (kể cả lần học không ra công thức mới). */
export async function insertTrainingRun(run: NewTrainingRun): Promise<TrainingRunRecord> {
  const rows = await db().query<TrainingRunRecord>(
    `INSERT INTO model_training_runs (
       node_id, started_at, trigger, status, reason, pairs_total, samples_used,
       base_version, new_version, mae_new_cm, mae_old_cm, mae_baseline_cm
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id::text AS id, node_id, started_at, trigger, status, reason, pairs_total, samples_used,
               base_version, new_version, mae_new_cm, mae_old_cm, mae_baseline_cm`,
    [
      run.node_id,
      run.started_at,
      run.trigger,
      run.status,
      run.reason,
      run.pairs_total,
      run.samples_used,
      run.base_version,
      run.new_version,
      run.mae_new_cm,
      run.mae_old_cm,
      run.mae_baseline_cm,
    ],
  );
  return rows[0]!;
}
