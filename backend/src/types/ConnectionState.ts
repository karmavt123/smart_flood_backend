/**
 * TRẠNG THÁI KẾT NỐI của node (xem quy tắc ở src/config/floodRules.ts):
 *   online  = Đang hoạt động
 *   slow    = Chậm dữ liệu
 *   offline = Mất kết nối — KHÔNG có nghĩa là khu vực đó an toàn, chỉ là không biết tình hình hiện tại
 *   nodata  = node chưa từng gửi dữ liệu
 */
export type ConnectionState = 'online' | 'slow' | 'offline' | 'nodata';
