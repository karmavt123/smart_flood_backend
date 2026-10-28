import type { RequestHandler } from 'express';

import { HttpError } from './HttpError.js';

/**
 * GIỚI HẠN SỐ LẦN GỌI mỗi phút cho mỗi địa chỉ IP — dùng cho API gọi ra dịch vụ ngoài (OSRM, Overpass)
 * để 1 người bấm liên tục không làm máy chủ bị các dịch vụ đó chặn.
 */
export function limitRequestsPerMinute(maxPerMinute: number): RequestHandler {
  const hits = new Map<string, { windowStart: number; count: number }>();
  return (request, _response, next) => {
    const now = Date.now();
    const key = request.ip ?? 'unknown';
    const entry = hits.get(key);
    if (!entry || now - entry.windowStart >= 60_000) {
      hits.set(key, { windowStart: now, count: 1 });
      if (hits.size > 10_000) hits.clear(); // tránh đầy bộ nhớ
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > maxPerMinute) {
      next(new HttpError(429, 'Bạn thao tác nhanh quá, đợi 1 phút rồi thử lại'));
      return;
    }
    next();
  };
}
