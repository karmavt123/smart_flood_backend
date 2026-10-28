import { db } from '../../db/sharedDatabase.js';
import { NODE_SETTING_COLUMNS, type NodeSettings } from './NodeSettings.js';

/** Admin tạo node mới trước khi node gửi dữ liệu. Mã node đã có thì báo lỗi (trả về false). */
export async function createNode(nodeId: string, settings: NodeSettings): Promise<boolean> {
  const columns = ['id'];
  const values: unknown[] = [nodeId];
  if (settings.name === undefined) settings = { ...settings, name: nodeId };
  for (const [key, value] of Object.entries(settings)) {
    if (value === undefined) continue;
    columns.push(NODE_SETTING_COLUMNS[key as keyof NodeSettings]);
    values.push(value);
  }
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  const rows = await db().query<{ id: string }>(
    `INSERT INTO nodes (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING RETURNING id`,
    values,
  );
  return rows.length > 0;
}
