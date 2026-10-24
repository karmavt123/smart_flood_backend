import { db } from '../../db/sharedDatabase.js';
import type { NodeRecord } from '../../types/NodeRecord.js';

/** Lấy 1 node theo mã; không có thì trả về null. */
export async function findNodeRecord(nodeId: string): Promise<NodeRecord | null> {
  const rows = await db().query<NodeRecord>('SELECT * FROM nodes WHERE id = $1', [nodeId]);
  return rows[0] ?? null;
}
