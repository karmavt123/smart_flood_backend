/**
 * MỘT LẦN ĐO của trạm (node gửi lên máy chủ).
 * Giá trị null = node không gửi / không đo được (KHÔNG hiểu là 0).
 */
export interface SensorReading {
  nodeId: string;
  /** Thời điểm đo (chuỗi ISO). */
  timestamp: string;
  /** Độ sâu nước ngập trên mặt đường (cm), 0 = khô. */
  waterLevelCm: number | null;
  /** Tốc độ dâng trạm tự tính (mm/phút): dương = nước đang lên, âm = đang rút. */
  riseRateMmMin: number | null;
  /** Lượng mưa node đo được (mm). */
  rainMm: number | null;
  /** Cường độ mưa (mm/giờ). Node gửi mm/giây, máy chủ đã đổi sang mm/giờ cho dễ đọc. */
  rainRateMmH: number | null;
  /** Kiểu gói tin cũ: tổng lượng mưa 60 phút gần nhất (mm). Trạm A01, A02 không gửi. */
  rainMm1h: number | null;
  /** Thủy triều (m) — cùng đơn vị bên IoT gửi. */
  tideM: number | null;
  temperatureC: number | null;
  humidityPct: number | null;
  lightLux: number | null;
  /** Pin của node (%). */
  batteryPct: number | null;
  /** Cường độ sóng Wi-Fi trạm bắt được (dBm). */
  rssiDbm: number | null;
  /** Độ sâu ngập TRẠM TỰ DỰ ĐOÁN sau `forecastMinutes` phút (cm), bằng công thức máy chủ gửi xuống. */
  predictedDepthCm: number | null;
  forecastMinutes: number | null;
  /** Dự đoán bằng phiên bản công thức nào. */
  modelVersion: number | null;
}
