import { timingSafeEqual } from 'node:crypto';

import type { RequestHandler } from 'express';

import { HttpError } from './HttpError.js';

/**
 * CHẶN API ADMIN nếu không có đúng khóa. Gửi khóa trong header:  x-admin-key: <ADMIN_API_KEY>
 * (So sánh kiểu "thời gian không đổi" để không đoán dần được khóa qua thời gian phản hồi.)
 */
export function requireAdminKey(adminKey: string): RequestHandler {
  const expected = Buffer.from(adminKey);
  return (request, _response, next) => {
    const given = Buffer.from(String(request.header('x-admin-key') ?? ''));
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      next(new HttpError(401, 'Sai hoặc thiếu khóa admin (header x-admin-key)'));
      return;
    }
    next();
  };
}
