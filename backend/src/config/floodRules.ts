/**
 * CÁC QUY ƯỚC VỀ NGẬP mà cả backend dùng chung. Muốn đổi quy tắc thì sửa ở đây.
 */

/** Ngưỡng mặc định khi node mới xuất hiện (cm nước trên mặt đường). Admin sửa riêng từng node được. */
export const DEFAULT_THRESHOLDS_CM = {
  /** ≥ 10 cm: ngập mắt cá, đi lại khó → Cảnh báo */
  warning: 10,
  /** ≥ 25 cm: ngập gần nửa bánh xe máy → Nguy hiểm */
  danger: 25,
  /** ≥ 40 cm: xe máy dễ chết máy → Rất nguy hiểm */
  critical: 40,
} as const;

/**
 * BÁN KÍNH ẢNH HƯỞNG quanh 1 node đang ngập (mét). Node chỉ đo được 1 điểm, nên đây là ƯỚC LƯỢNG:
 * các đoạn đường trong vòng này được tô màu ngập, và tuyến đường đi qua vòng này bị coi là có nguy cơ.
 */
export const INFLUENCE_RADIUS_M = {
  normal: 0,
  warning: 100,
  danger: 200,
  critical: 300,
  unknown: 0,
} as const;

/** Mặc định node gửi dữ liệu 5 phút 1 lần. */
export const DEFAULT_EXPECTED_INTERVAL_SEC = 300;

/**
 * TÍNH TRẠNG THÁI KẾT NỐI theo chu kỳ gửi của từng node (node ngủ sâu nên không gửi liên tục):
 *   chưa quá 2 chu kỳ  → online  (Đang hoạt động)
 *   chưa quá 6 chu kỳ  → slow    (Chậm dữ liệu)
 *   quá 6 chu kỳ       → offline (Mất kết nối)
 */
export const ONLINE_WITHIN_INTERVALS = 2;
export const SLOW_WITHIN_INTERVALS = 6;

/** Giờ thiết bị chạy nhanh hơn giờ máy chủ quá 5 phút thì coi là sai, dùng giờ máy chủ. */
export const DEVICE_CLOCK_MAX_AHEAD_SEC = 300;

/**
 * Node chỉ gửi GIỜ ("14:05:30", không có ngày) thì máy chủ tự ghép ngày hôm nay (giờ Việt Nam).
 * Vì phải đoán ngày, nếu giờ đó chậm hơn giờ máy chủ quá 15 phút thì coi là đồng hồ node sai
 * (vd node mới bật, đồng hồ về 00:00:00) và dùng giờ máy chủ — để không lưu nhầm ngày hoặc mất tin.
 */
export const DEVICE_CLOCK_ONLY_MAX_BEHIND_SEC = 900;

/** Việt Nam là UTC+7, không đổi giờ theo mùa. */
export const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Kiểm tra tuyến: cộng thêm vùng đệm an toàn 50 m quanh vùng ảnh hưởng. */
export const ROUTE_SAFETY_BUFFER_M = 50;

/** Màn "Quanh bạn": bán kính mặc định 2 km, tối đa 10 km. */
export const NEARBY_DEFAULT_RADIUS_M = 2000;
export const NEARBY_MAX_RADIUS_M = 10000;
