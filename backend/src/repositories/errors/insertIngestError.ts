import { db } from '../../db/sharedDatabase.js';

const MAX_PAYLOAD_LENGTH = 4000;

/** Ghi lại 1 tin nhắn bị từ chối kèm lý do — admin xem ở trang /admin, mục "Tin nhắn lỗi". */
export async function insertIngestError(channel: string, topic: string | null, payload: string, reason: string) {
  await db().query('INSERT INTO ingest_errors (channel, topic, payload, reason) VALUES ($1, $2, $3, $4)', [
    channel,
    topic,
    payload.slice(0, MAX_PAYLOAD_LENGTH),
    reason,
  ]);
}
