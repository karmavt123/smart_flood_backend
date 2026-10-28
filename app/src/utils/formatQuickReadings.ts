import type { SensorReading } from '@/types/SensorReading';

/**
 * DÒNG TÓM TẮT NGẮN cho thẻ trạm trên bản đồ, vd "Mưa 14.4 mm/h · Triều 1.35 m · 29.4 °C".
 * Phần nào trạm không gửi thì bỏ; không có gì để ghi thì trả về null.
 * Mưa ưu tiên cường độ (mm/h) vì dễ hình dung "đang mưa to hay nhỏ" hơn lượng mưa cộng dồn.
 */
export function formatQuickReadings(reading: SensorReading | null): string | null {
  if (!reading) return null;
  const parts: string[] = [];
  if (reading.rainRateMmH !== null) parts.push(`Mưa ${reading.rainRateMmH.toFixed(1)} mm/h`);
  else if (reading.rainMm !== null) parts.push(`Mưa ${reading.rainMm.toFixed(1)} mm`);
  else if (reading.rainMm1h !== null) parts.push(`Mưa 1 giờ ${reading.rainMm1h.toFixed(1)} mm`);
  if (reading.tideM !== null) parts.push(`Triều ${reading.tideM.toFixed(2)} m`);
  if (reading.temperatureC !== null) parts.push(`${reading.temperatureC.toFixed(1)} °C`);
  return parts.length ? parts.join(' · ') : null;
}
