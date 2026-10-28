import { sensorMetrics } from '@/constants/sensorMetrics';
import type { SensorReading } from '@/types/SensorReading';

import { toVietnamTime, twoDigits } from './toVietnamTime';

/**
 * ĐỔI LỊCH SỬ ĐO THÀNH NỘI DUNG FILE CSV (mở được bằng Excel / Google Sheets).
 *  - Cột đầu là thời điểm đo theo giờ Việt Nam, dạng "2026-10-28 14:05:30".
 *  - Chỉ có cột cho thông số trạm có gửi (trạm không gửi độ ẩm thì không có cột độ ẩm).
 *  - Ô trống = lần đo đó không có số, KHÔNG ghi 0.
 */
export function toReadingsCsv(readings: SensorReading[]): string {
  const columns = sensorMetrics.filter((metric) => readings.some((reading) => reading[metric.key] !== null));
  const header = ['Thời điểm đo (giờ VN)', ...columns.map((metric) => `${metric.label} (${metric.unit})`)];
  const rows = readings.map((reading) => [
    formatCsvTime(reading.timestamp),
    ...columns.map((metric) => {
      const value = reading[metric.key];
      return value === null ? '' : String(value);
    }),
  ]);
  return [header, ...rows].map((cells) => cells.join(',')).join('\r\n');
}

function formatCsvTime(iso: string): string {
  const d = toVietnamTime(iso);
  if (!d) return iso;
  return `${d.getUTCFullYear()}-${twoDigits(d.getUTCMonth() + 1)}-${twoDigits(d.getUTCDate())} ${twoDigits(d.getUTCHours())}:${twoDigits(d.getUTCMinutes())}:${twoDigits(d.getUTCSeconds())}`;
}
