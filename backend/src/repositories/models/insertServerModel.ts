import { db } from '../../db/sharedDatabase.js';
import type { NodeModelRecord } from '../../types/NodeModelRecord.js';

export interface NewServerModel {
  trainedAt: Date;
  samples: number;
  horizonMinutes: number;
  intercept: number;
  coefficients: Record<string, number>;
  maeCm: number;
  rmseCm: number;
  r2: number | null;
}

/**
 * LƯU 1 PHIÊN BẢN CÔNG THỨC MÁY CHỦ VỪA HỌC. Số phiên bản = phiên bản lớn nhất hiện có + 1
 * (đánh số chung với các phiên bản trạm tự gửi lên, nên không bao giờ trùng).
 */
export async function insertServerModel(nodeId: string, model: NewServerModel): Promise<NodeModelRecord> {
  const rows = await db().query<NodeModelRecord>(
    `INSERT INTO node_models (
       node_id, version, source, trained_at, samples, horizon_minutes, intercept, coefficients, mae_cm, rmse_cm, r2
     )
     SELECT $1, COALESCE(MAX(version), 0) + 1, 'server', $2, $3, $4, $5, $6::jsonb, $7, $8, $9
     FROM node_models WHERE node_id = $1
     RETURNING *`,
    [
      nodeId,
      model.trainedAt,
      model.samples,
      model.horizonMinutes,
      model.intercept,
      JSON.stringify(model.coefficients),
      model.maeCm,
      model.rmseCm,
      model.r2,
    ],
  );
  return rows[0]!;
}
