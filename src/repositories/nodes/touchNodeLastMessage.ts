import { db } from '../../db/sharedDatabase.js';

/** Ghi lại "lần cuối máy chủ nhận tin nhắn trực tiếp của node" — dùng để tính online / mất kết nối. */
export async function touchNodeLastMessage(nodeId: string, receivedAt: Date) {
  await db().query(
    `UPDATE nodes SET last_message_at = GREATEST(COALESCE(last_message_at, $2), $2) WHERE id = $1`,
    [nodeId, receivedAt],
  );
}
