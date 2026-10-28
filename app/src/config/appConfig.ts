/**
 * CẤU HÌNH CHUNG CỦA APP
 * Muốn đổi máy chủ, bật chế độ demo... thì sửa file .env.local (xem .env.example),
 * KHÔNG cần sửa code. Biến EXPO_PUBLIC_ được nhúng vào app nên KHÔNG để mật khẩu ở đây.
 */

/**
 * Địa chỉ BACKEND SmartFlood mới (thư mục smartflood-backend), vd:
 *   - chạy thử trên laptop, mở app bằng trình duyệt:  http://localhost:3000
 *   - mở app trên điện thoại, backend chạy trên laptop: http://<IP laptop>:3000  (vd http://192.168.1.15:3000)
 *   - máy chủ thật anh mentor deploy:                    https://<tên miền hoặc IP máy chủ>
 * Backend bật CORS nên trình duyệt gọi thẳng được, không cần chuyển tiếp.
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Chế độ DEMO: dùng dữ liệu mẫu trong thư mục src/demo, không gọi máy chủ.
 * Dùng khi không có mạng lúc thuyết trình. App sẽ hiện dải vàng "CHẾ ĐỘ DEMO".
 */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

/** Bao lâu tải lại danh sách trạm một lần (mili giây). Realtime vẫn cập nhật ngay khi có dữ liệu mới. */
export const STATION_REFRESH_MS = 30 * 1000;

/** Bao lâu tải lại tình hình ngập quanh bạn (mili giây). */
export const NEARBY_REFRESH_MS = 30 * 1000;

/** Bán kính "Quanh bạn" (mét): 2 km. */
export const NEARBY_RADIUS_M = 2000;

/** Quá thời gian này mà máy chủ chưa trả lời thì báo lỗi (mili giây). */
export const REQUEST_TIMEOUT_MS = 20 * 1000;

/**
 * Kiểm tra tuyến đường: trạm MẤT KẾT NỐI nằm cách tuyến trong khoảng này (mét) thì app báo
 * "Chưa đủ dữ liệu đánh giá" thay vì kết luận tuyến an toàn (FR-14).
 * = bán kính ảnh hưởng lớn nhất máy chủ dùng (300 m) + vùng đệm an toàn (50 m).
 */
export const ROUTE_UNRELIABLE_STATION_RANGE_M = 350;

/** Tâm bản đồ khi chưa có vị trí của bạn: trung tâm TP.HCM. */
export const DEFAULT_MAP_CENTER = { latitude: 10.7769, longitude: 106.7009 };
