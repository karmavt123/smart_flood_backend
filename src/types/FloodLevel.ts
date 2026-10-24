/**
 * MỨC NGẬP — so độ sâu ngập với 3 ngưỡng của node:
 *   normal   = An toàn        (dưới ngưỡng cảnh báo)
 *   warning  = Cảnh báo
 *   danger   = Nguy hiểm
 *   critical = Rất nguy hiểm
 *   unknown  = chưa có số đo
 */
export type FloodLevel = 'normal' | 'warning' | 'danger' | 'critical' | 'unknown';
