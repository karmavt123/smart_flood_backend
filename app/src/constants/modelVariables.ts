/**
 * Ý NGHĨA CÁC BIẾN trong công thức dự đoán (theo báo cáo: dự đoán độ ngập 5 phút tới).
 * Node gửi hệ số theo đúng các tên viết tắt này (xem IOT_DATA_FORMAT.md của backend).
 */
export const modelVariableLabels: Record<string, string> = {
  H: 'độ ngập hiện tại (cm)',
  V: 'tốc độ dâng (cm/phút)',
  T: 'nhiệt độ (°C)',
  RH: 'độ ẩm (%)',
  L: 'ánh sáng (lux)',
  R: 'mưa (mm)',
  S: 'triều (cm)',
};

/** Thứ tự hiển thị các biến trong công thức (biến lạ xếp cuối). */
export const MODEL_VARIABLE_ORDER = ['H', 'V', 'R', 'S', 'T', 'RH', 'L'];
