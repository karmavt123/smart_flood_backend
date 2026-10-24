import type { ConnectionState } from '../types/ConnectionState.js';

/**
 * Dữ liệu ngập của node còn đủ mới để VẼ VÙNG NGẬP và dùng khi KIỂM TRA TUYẾN không?
 * Chỉ online và slow mới dùng. Node mất kết nối thì KHÔNG giữ mãi trạng thái ngập cũ
 * (đây là lỗi của backend cũ: node tắt rồi mà bản đồ vẫn báo ngập).
 */
export function isFloodInfoUsable(state: ConnectionState): boolean {
  return state === 'online' || state === 'slow';
}
