/** Kết quả xử lý 1 tin nhắn của node. */
export type IngestResult =
  | { ok: true; nodeId: string; status: 'saved' | 'duplicate'; newModelVersion: number | null }
  | { ok: false; reason: string };
