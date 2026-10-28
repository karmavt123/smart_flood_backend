import { API_BASE_URL, DEMO_MODE, REQUEST_TIMEOUT_MS } from '@/config/appConfig';
import { getDemoResponse } from '@/demo/getDemoResponse';

import { ApiError } from './ApiError';

type Method = 'GET' | 'POST';

/**
 * HÀM GỌI MÁY CHỦ DUY NHẤT của app. Mọi file trong src/api đều đi qua đây.
 *
 * - API của backend mới là CÔNG KHAI (chỉ đọc), không cần đăng nhập.
 * - Có giới hạn thời gian chờ (REQUEST_TIMEOUT_MS).
 * - Lỗi được đổi thành ApiError có câu thông báo tiếng Việt (máy chủ trả dạng { "error": "..." }).
 * - Chế độ DEMO: không gọi mạng, lấy dữ liệu mẫu từ src/demo.
 *
 * @param path ví dụ "/api/v1/stations"
 */
export async function requestJson<T = any>(method: Method, path: string, body?: unknown): Promise<T> {
  if (DEMO_MODE) return getDemoResponse(method, path, body) as Promise<T>;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted
        ? 'Máy chủ phản hồi quá lâu. Kiểm tra mạng rồi thử lại.'
        : `Không kết nối được máy chủ (${API_BASE_URL}). Kiểm tra mạng hoặc địa chỉ máy chủ.`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data?.error || `Máy chủ báo lỗi (HTTP ${response.status}).`, response.status);
  }
  return data as T;
}
