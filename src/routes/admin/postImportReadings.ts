import type { RequestHandler } from 'express';
import { z } from 'zod';

import { handleNodeMessage } from '../../ingest/handleNodeMessage.js';

const bodySchema = z.object({ messages: z.array(z.unknown()).min(1).max(5000) });

/**
 * POST /api/v1/admin/import  body: { "messages": [ {...}, {...} ] }  (tối đa 5000 tin mỗi lần)
 * NHẬP DỮ LIỆU CŨ bên IoT đưa (cùng định dạng tin nhắn MQTT, nhưng BẮT BUỘC có measured_at).
 * Script `npm run import -- file.json` gọi API này và tự chia nhỏ file lớn.
 */
export const postImportReadings: RequestHandler = async (request, response) => {
  const { messages } = bodySchema.parse(request.body);
  let saved = 0;
  let duplicates = 0;
  const rejected: { index: number; reason: string }[] = [];
  for (const [index, message] of messages.entries()) {
    const result = await handleNodeMessage({ channel: 'import', topic: null, nodeIdFromTopic: null, payload: message });
    if (!result.ok) rejected.push({ index, reason: result.reason });
    else if (result.status === 'saved') saved += 1;
    else duplicates += 1;
  }
  response.json({ received: messages.length, saved, duplicates, rejectedCount: rejected.length, rejected: rejected.slice(0, 50) });
};
