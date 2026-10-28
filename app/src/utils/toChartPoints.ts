import type { SensorMetricKey } from '@/constants/sensorMetrics';
import type { SensorReading } from '@/types/SensorReading';

import type { ChartPoint } from './splitSeriesAtGaps';

/**
 * ĐỔI DANH SÁCH SỐ ĐO THÀNH CÁC ĐIỂM VẼ BIỂU ĐỒ cho một thông số (độ ngập, mưa, nhiệt độ...).
 * Lần đo nào thiếu thông số đó thì BỎ QUA (không thay bằng 0 — đúng yêu cầu tài liệu).
 */
export function toChartPoints(readings: SensorReading[], metric: SensorMetricKey): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (const reading of readings) {
    const value = reading[metric];
    const timeMs = Date.parse(reading.timestamp);
    if (value === null || Number.isNaN(timeMs)) continue;
    points.push({ timeMs, value });
  }
  return points.sort((a, b) => a.timeMs - b.timeMs);
}
