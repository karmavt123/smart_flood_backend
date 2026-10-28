import { Platform } from 'react-native';

/** Mã lỗi "hết giờ" do app tự đặt khi lấy vị trí quá lâu (xem useCurrentLocation). */
export const LOCATION_TIMEOUT_CODE = 'APP_LOCATION_TIMEOUT';

/**
 * ĐỔI LỖI LẤY VỊ TRÍ THÀNH CÂU DỄ HIỂU, nói rõ vì sao và phải làm gì.
 * Trình duyệt dùng mã số: 1 = bị chặn quyền, 2 = không xác định được vị trí, 3 = quá lâu.
 * Điện thoại (expo-location) dùng mã chữ như E_LOCATION_SERVICES_DISABLED.
 */
export function describeLocationError(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  const onWeb = Platform.OS === 'web';
  const pickTip = onWeb ? 'bấm chuột phải lên bản đồ ngay chỗ bạn' : 'chạm giữ lên bản đồ ngay chỗ bạn';

  if (code === 1 || code === 'E_LOCATION_UNAUTHORIZED' || code === 'DENIED') {
    return onWeb
      ? 'Trình duyệt đang chặn quyền vị trí. Bấm biểu tượng bên trái địa chỉ web → bật Vị trí → tải lại trang (F5).'
      : 'App chưa được dùng vị trí. Vào Cài đặt điện thoại → Expo Go → Vị trí → cho phép.';
  }
  if (code === 3 || code === LOCATION_TIMEOUT_CODE) {
    return `Lấy vị trí quá lâu. Bấm ◎ để thử lại, hoặc ${pickTip} để xem ngập quanh đó.`;
  }
  // Mã 2 / E_LOCATION_SERVICES_DISABLED / E_LOCATION_UNAVAILABLE / lỗi khác
  return onWeb
    ? `Trình duyệt đã cho phép nhưng máy tính không xác định được vị trí (thường do Windows/macOS tắt Dịch vụ vị trí). Tạm thời ${pickTip} để xem ngập quanh đó.`
    : `Điện thoại chưa bật định vị (GPS). Bật lên rồi bấm ◎, hoặc ${pickTip}.`;
}
