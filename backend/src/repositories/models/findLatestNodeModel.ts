import { db } from '../../db/sharedDatabase.js';
import type { NodeModelRecord } from '../../types/NodeModelRecord.js';

/** Phiên bản công thức MỚI NHẤT của 1 node (trạm gửi hay máy chủ học đều được); chưa có thì null. */
export async function findLatestNodeModel(nodeId: string): Promise<NodeModelRecord | null> {
  const rows = await db().query<NodeModelRecord>(
    'SELECT * FROM node_models WHERE node_id = $1 ORDER BY version DESC LIMIT 1',
    [nodeId],
  );
  return rows[0] ?? null;
}
