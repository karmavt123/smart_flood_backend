import { db } from '../../db/sharedDatabase.js';
import type { NodeModelRecord } from '../../types/NodeModelRecord.js';

/** Tất cả phiên bản công thức của 1 node, từ cũ (v1 = công thức chung) đến mới. */
export async function listNodeModels(nodeId: string): Promise<NodeModelRecord[]> {
  return db().query<NodeModelRecord>('SELECT * FROM node_models WHERE node_id = $1 ORDER BY version ASC', [nodeId]);
}
