import type { RequestHandler } from 'express';
import { z } from 'zod';

import { handleNodeMessage } from '../../ingest/handleNodeMessage.js';

const bodySchema = z.object({ message: z.unknown() });

/**
 * POST /api/v1/admin/messages  body: { "message": { ...1 tin nhắn giống node gửi... } }
 * GỬI THỬ 1 TIN NHẮN mà không cần MQTT — bên IoT dùng để kiểm tra định dạng JSON trước khi nối trạm thật.
 * Xử lý y như tin nhắn MQTT thật (lưu vào DB, app thấy luôn). Trả về đã lưu hay bị từ chối vì sao.
 */
export const postTestMessage: RequestHandler = async (request, response) => {
  const { message } = bodySchema.parse(request.body);
  const result = await handleNodeMessage({ channel: 'admin-test', topic: null, nodeIdFromTopic: null, payload: message });
  response.status(result.ok ? 200 : 422).json(result);
};
