import { db } from '../../db/sharedDatabase.js';
import type { ParsedNodeMessage } from '../../ingest/ParsedNodeMessage.js';

/**
 * LƯU 1 PHIÊN BẢN CÔNG THỨC node vừa gửi. Node gửi lại phiên bản đã có thì bỏ qua (giữ bản lưu đầu tiên).
 * Trả về true nếu đây là phiên bản MỚI (node vừa học lại xong).
 */
export async function insertNodeModel(nodeId: string, model: NonNullable<ParsedNodeMessage['model']>): Promise<boolean> {
  const rows = await db().query<{ inserted: number }>(
    `INSERT INTO node_models (
       node_id, version, trained_at, samples, horizon_minutes, intercept, coefficients, mae_cm, rmse_cm, r2
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
     ON CONFLICT (node_id, version) DO NOTHING
     RETURNING 1 AS inserted`,
    [
      nodeId,
      model.version,
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
  return rows.length > 0;
}
