import type { SensorReading } from '@/types/SensorReading';

/**
 * CÁC THÔNG SỐ ĐO app hiển thị (thẻ "Thông số đo" và biểu đồ lịch sử), kèm đơn vị và số chữ số lẻ.
 * Thông số nào trạm KHÔNG gửi thì app tự ẩn (vd trạm A01, A02 không gửi độ ẩm, ánh sáng).
 * `inCard: false` = chỉ có trên biểu đồ, không lặp lại trong thẻ (độ ngập đã có thẻ riêng to hơn).
 */
export const sensorMetrics = [
  { key: 'waterLevelCm', label: 'Độ ngập', unit: 'cm', digits: 1, inCard: false },
  { key: 'drainMm5min', label: 'Thoát nước', unit: 'mm/5 phút', digits: 1, inCard: true },
  { key: 'rainMm', label: 'Mưa (5 phút)', unit: 'mm', digits: 1, inCard: true },
  { key: 'rainRateMmH', label: 'Cường độ mưa', unit: 'mm/h', digits: 1, inCard: true },
  { key: 'rainMm1h', label: 'Mưa 1 giờ', unit: 'mm', digits: 1, inCard: true },
  { key: 'tideM', label: 'Thủy triều', unit: 'm', digits: 2, inCard: true },
  { key: 'temperatureC', label: 'Nhiệt độ', unit: '°C', digits: 1, inCard: true },
  { key: 'humidityPct', label: 'Độ ẩm', unit: '%', digits: 0, inCard: true },
  { key: 'lightLux', label: 'Ánh sáng', unit: 'lx', digits: 0, inCard: true },
  { key: 'batteryPct', label: 'Pin node', unit: '%', digits: 0, inCard: true },
  { key: 'predictedDepthCm', label: 'Sau 5 phút (dự báo)', unit: 'cm', digits: 1, inCard: false },
] as const satisfies readonly {
  key: keyof SensorReading;
  label: string;
  unit: string;
  digits: number;
  inCard: boolean;
}[];

export type SensorMetricKey = (typeof sensorMetrics)[number]['key'];
