import { db } from '../../db/sharedDatabase.js';
import type { NodeModelRecord } from '../../types/NodeModelRecord.js';

/** Tất cả phiên bản công thức của 1 node, từ cũ đến mới (trạm gửi lên + máy chủ học, đánh số chung). */
export async function listNodeModels(nodeId: string): Promise<NodeModelRecord[]> {
  return db().query<NodeModelRecord>('SELECT * FROM node_models WHERE node_id = $1 ORDER BY version ASC', [nodeId]);
}
