import { db } from '../../db/sharedDatabase.js';
import { NODE_SETTING_COLUMNS, type NodeSettings } from './NodeSettings.js';

/** Admin sửa thông tin node (chỉ sửa những trường có gửi lên). Trả về false nếu không có node này. */
export async function updateNode(nodeId: string, settings: NodeSettings): Promise<boolean> {
  const sets: string[] = [];
  const values: unknown[] = [nodeId];
  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined) continue;
    values.push(value);
    sets.push(`${NODE_SETTING_COLUMNS[key as keyof NodeSettings]} = $${values.length}`);
  }
  if (sets.length === 0) return (await db().query('SELECT 1 FROM nodes WHERE id = $1', [nodeId])).length > 0;
  const rows = await db().query<{ id: string }>(
    `UPDATE nodes SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING id`,
    values,
  );
  return rows.length > 0;
}
