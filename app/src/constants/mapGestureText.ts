import { Platform } from 'react-native';

/**
 * CÁCH CHỌN MỘT ĐIỂM TRÊN BẢN ĐỒ, viết đúng theo thiết bị:
 * điện thoại thì "chạm giữ", trình duyệt trên laptop thì "bấm chuột phải".
 * Dùng trong các câu hướng dẫn kiểm tra tuyến đường.
 */
export const PICK_POINT_ON_MAP = Platform.OS === 'web' ? 'bấm chuột phải lên bản đồ' : 'chạm giữ trên bản đồ';
