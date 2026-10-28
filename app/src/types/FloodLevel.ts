/**
 * MỨC NGẬP của một trạm — máy chủ so ĐỘ SÂU NGẬP (cm nước trên mặt đường) với 3 ngưỡng của từng trạm.
 * Ngưỡng mặc định (admin sửa riêng từng trạm được):
 *   normal   = An toàn        (dưới 10 cm)
 *   warning  = Cảnh báo       (từ 10 cm)
 *   danger   = Nguy hiểm      (từ 25 cm)
 *   critical = Rất nguy hiểm  (từ 40 cm)
 *   unknown  = Chưa có dữ liệu để xếp mức
 */
export type FloodLevel = 'normal' | 'warning' | 'danger' | 'critical' | 'unknown';
