/** 1 dòng của bảng `readings` (1 lần đo). Thời gian có thể là Date hoặc chuỗi tùy cách truy vấn. */
export interface ReadingRecord {
  node_id: string;
  measured_at: Date | string;
  received_at: Date | string;
  time_source: 'device' | 'server';
  flood_depth_cm: number;
  rain_mm_1h: number;
  tide_cm: number;
  temperature_c: number | null;
  humidity_pct: number | null;
  light_lux: number | null;
  battery_pct: number | null;
  rssi_dbm: number | null;
  predicted_depth_cm: number | null;
  forecast_minutes: number | null;
  model_version: number | null;
  source: 'mqtt' | 'import' | 'admin-test';
  extra: Record<string, unknown>;
}
