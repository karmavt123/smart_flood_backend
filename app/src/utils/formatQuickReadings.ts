import type { SensorReading } from '@/types/SensorReading';

/**
 * DÒNG TÓM TẮT NGẮN cho thẻ trạm trên bản đồ (gói tin 3.1), vd
 *   "Thoát nước: 6.5 mm/5 phút · Mưa (5 phút): 2.5 mm · Triều 1.35 m".
 * (Đang dâng / Đang rút / Ổn định đã nằm trong ô "Sau 5 phút" ngay bên trên nên không lặp lại ở đây.)
 * App chỉ hiển thị đúng số trạm gửi lên, không tự tính. Phần nào trạm không gửi thì bỏ; không có gì để ghi thì trả về null.
 */
export function formatQuickReadings(reading: SensorReading | null): string | null {
  if (!reading) return null;
  const parts: string[] = [];
  if (reading.drainMm5min !== null) parts.push(`Thoát nước: ${reading.drainMm5min.toFixed(1)} mm/5 phút`);
  if (reading.rainMm !== null) parts.push(`Mưa (5 phút): ${reading.rainMm.toFixed(1)} mm`);
  else if (reading.rainRateMmH !== null) parts.push(`Mưa ${reading.rainRateMmH.toFixed(1)} mm/h`);
  else if (reading.rainMm1h !== null) parts.push(`Mưa 1 giờ ${reading.rainMm1h.toFixed(1)} mm`);
  if (reading.tideM !== null) parts.push(`Triều ${reading.tideM.toFixed(2)} m`);
  if (reading.temperatureC !== null) parts.push(`${reading.temperatureC.toFixed(1)} °C`);
  return parts.length ? parts.join(' · ') : null;
}
