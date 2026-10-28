/**
 * TRẠNG THÁI KẾT NỐI của trạm — máy chủ tính theo lần cuối có dữ liệu và chu kỳ gửi của trạm
 * (mặc định 5 phút/lần):
 *   online  = có dữ liệu trong 2 chu kỳ gần nhất (≤ 10 phút)
 *   slow    = "Chậm dữ liệu" (≤ 6 chu kỳ, tức ≤ 30 phút)
 *   offline = lâu hơn nữa không có dữ liệu
 *   nodata  = trạm chưa từng gửi dữ liệu
 *
 * Lưu ý: trạm offline KHÔNG có nghĩa là khu vực an toàn — chỉ là app không biết tình hình hiện tại.
 */
export type ConnectionState = 'online' | 'slow' | 'offline' | 'nodata';
