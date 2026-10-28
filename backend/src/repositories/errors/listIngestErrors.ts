import { db } from '../../db/sharedDatabase.js';

export interface IngestErrorRow {
  id: string;
  received_at: Date | string;
  channel: string;
  topic: string | null;
  payload: string;
  reason: string;
}

/** Các tin nhắn bị từ chối gần nhất (mới nhất trước). */
export async function listIngestErrors(limit: number): Promise<IngestErrorRow[]> {
  return db().query<IngestErrorRow>(
    'SELECT id::text AS id, received_at, channel, topic, payload, reason FROM ingest_errors ORDER BY received_at DESC, id DESC LIMIT $1',
    [limit],
  );
}
