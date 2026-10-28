import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { HttpError } from './HttpError.js';

/**
 * XỬ LÝ LỖI CHUNG cho mọi API: luôn trả JSON dạng { "error": "câu tiếng Việt" }.
 * Lỗi không lường trước → 500 và in chi tiết ra màn hình máy chủ (không gửi chi tiết cho người dùng).
 */
export const handleHttpError: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof ZodError) {
    const detail = error.issues.map((issue) => `${issue.path.join('.') || 'dữ liệu'}: ${issue.message}`).join('; ');
    response.status(400).json({ error: `Dữ liệu gửi lên không hợp lệ — ${detail}` });
    return;
  }
  const text = String((error as Error)?.message ?? error);
  if (text.includes('nodes_thresholds_order')) {
    response.status(400).json({ error: 'Ngưỡng phải lớn hơn 0 và tăng dần: Cảnh báo < Nguy hiểm < Rất nguy hiểm' });
    return;
  }
  if ((error as { type?: string })?.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'Nội dung gửi lên không phải JSON hợp lệ' });
    return;
  }
  console.error('[http] Lỗi không lường trước:', error);
  response.status(500).json({ error: 'Máy chủ gặp lỗi, thử lại sau' });
};
