import { db } from '../../db/sharedDatabase.js';

/** Ghi lại lúc máy chủ gửi phiên bản này xuống trạm qua MQTT (chỉ ghi lần gửi đầu tiên). */
export async function markModelPublished(nodeId: string, version: number, at: Date): Promise<void> {
  await db().query(
    'UPDATE node_models SET published_at = $3 WHERE node_id = $1 AND version = $2 AND published_at IS NULL',
    [nodeId, version, at],
  );
}
