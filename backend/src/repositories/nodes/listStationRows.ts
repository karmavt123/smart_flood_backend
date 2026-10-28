import { db } from '../../db/sharedDatabase.js';
import type { NodeModelRecord } from '../../types/NodeModelRecord.js';
import type { NodeRecord } from '../../types/NodeRecord.js';
import type { ReadingRecord } from '../../types/ReadingRecord.js';

export interface StationRow {
  node: NodeRecord;
  /** Lần đo mới nhất; null nếu node chưa có dữ liệu. */
  latest: ReadingRecord | null;
  /** Phiên bản công thức mới nhất; null nếu node chưa gửi công thức. */
  model: NodeModelRecord | null;
}

/**
 * Lấy các node kèm LẦN ĐO MỚI NHẤT và CÔNG THỨC MỚI NHẤT của từng node, trong 1 câu SQL.
 * `LEFT JOIN LATERAL ... LIMIT 1` = với mỗi node, lấy đúng 1 dòng mới nhất ở bảng kia (dùng index nên nhanh).
 */
export async function listStationRows(options: { includeInactive: boolean; nodeId?: string }): Promise<StationRow[]> {
  return db().query<StationRow>(
    `SELECT to_jsonb(n) AS node, to_jsonb(r) AS latest, to_jsonb(m) AS model
     FROM nodes n
     LEFT JOIN LATERAL (
       SELECT * FROM readings WHERE node_id = n.id ORDER BY measured_at DESC LIMIT 1
     ) r ON TRUE
     LEFT JOIN LATERAL (
       SELECT * FROM node_models WHERE node_id = n.id ORDER BY version DESC LIMIT 1
     ) m ON TRUE
     WHERE ($1::boolean OR n.is_active) AND ($2::text IS NULL OR n.id = $2)
     ORDER BY n.id`,
    [options.includeInactive, options.nodeId ?? null],
  );
}
