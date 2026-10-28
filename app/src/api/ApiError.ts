/**
 * Lỗi khi gọi máy chủ. `message` là câu tiếng Việt để hiện cho người dùng
 * (máy chủ SmartFlood luôn trả { success: false, message: "..." } khi lỗi).
 * `status` là mã HTTP (401 = chưa đăng nhập / hết phiên, 0 = không kết nối được).
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
