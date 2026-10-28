import { db } from '../../db/sharedDatabase.js';

/**
 * Node lạ gửi dữ liệu lần đầu → tự tạo node mới (tên tạm = mã node, chưa có vị trí).
 * Admin vào trang /admin điền tên, vị trí, ngưỡng sau. Node đã có thì không làm gì.
 */
export async function ensureNodeExists(nodeId: string) {
  await db().query('INSERT INTO nodes (id, name) VALUES ($1, $1) ON CONFLICT (id) DO NOTHING', [nodeId]);
}
