import { appConfig } from './appConfig.js';

const DEV_ADMIN_KEY = 'dev-admin-key';

/**
 * Lấy khóa admin. Máy chủ thật bắt buộc đặt ADMIN_API_KEY dài ≥ 16 ký tự (không thì không cho chạy).
 * Chạy thử trên laptop mà để trống → dùng tạm "dev-admin-key".
 */
export function resolveAdminKey(): string {
  const key = appConfig.adminApiKey;
  if (appConfig.isProduction && key.length < 16) {
    throw new Error('Máy chủ thật phải đặt ADMIN_API_KEY dài ít nhất 16 ký tự trong file .env');
  }
  if (!key) {
    console.warn(`[admin] Chưa đặt ADMIN_API_KEY → tạm dùng "${DEV_ADMIN_KEY}" (chỉ được dùng khi chạy thử)`);
    return DEV_ADMIN_KEY;
  }
  return key;
}
