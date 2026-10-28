import { db } from '../../db/sharedDatabase.js';

/** Các node ĐANG HIỆN trên app và có số đo kể từ `since` — lượt tự học mỗi ngày chỉ học các node này. */
export async function listNodesToRetrain(since: Date): Promise<string[]> {
  const rows = await db().query<{ id: string }>(
    `SELECT n.id FROM nodes n
     WHERE n.is_active AND EXISTS (SELECT 1 FROM readings r WHERE r.node_id = n.id AND r.measured_at >= $1)
     ORDER BY n.id`,
    [since],
  );
  return rows.map((row) => row.id);
}
