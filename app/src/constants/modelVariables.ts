/**
 * Ý NGHĨA CÁC BIẾN trong công thức dự đoán độ ngập 5 phút tới (bản 3.1, xem IOT_DATA_FORMAT.md của backend).
 * Hệ số dùng đúng đơn vị trong gói tin của trạm. T, RH, L chỉ có ở công thức cũ trong báo cáo.
 */
export const modelVariableLabels: Record<string, string> = {
  H: 'độ ngập hiện tại (mm)',
  V: 'tốc độ thoát nước (mm/5 phút)',
  R: 'lượng mưa trong 5 phút (mm)',
  S: 'thủy triều (m)',
  T: 'nhiệt độ (°C)',
  RH: 'độ ẩm (%)',
  L: 'ánh sáng (lux)',
};

/** Thứ tự hiển thị các biến trong công thức (biến lạ xếp cuối). */
export const MODEL_VARIABLE_ORDER = ['H', 'V', 'R', 'S', 'T', 'RH', 'L'];
