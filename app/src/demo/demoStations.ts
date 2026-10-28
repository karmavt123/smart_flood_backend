/**
 * DỮ LIỆU TRẠM MẪU cho chế độ DEMO — viết đúng định dạng JSON backend mới trả về (GET /api/v1/stations),
 * để toàn bộ code còn lại chạy y như khi nối máy chủ. Tên trạm có chữ "Demo" để không ai nhầm là số đo thật.
 *
 * Có đủ các tình huống cần trình diễn: rất nguy hiểm, nguy hiểm, cảnh báo, an toàn,
 * trạm mất kết nối (dữ liệu cũ), trạm chưa có dữ liệu.
 * Số đo giống gói tin thật của trạm A01, A02 (mực nước, lượng mưa, cường độ mưa, triều, nhiệt độ):
 * KHÔNG có độ ẩm, ánh sáng, pin, dự đoán, công thức — để demo hiện đúng như khi chạy thật.
 */
export interface DemoStationSeed {
  nodeId: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Độ sâu ngập lần đo cuối (cm); null = chưa có dữ liệu. */
  depth: number | null;
  /** Cường độ mưa (mm/giờ). */
  rainRate: number;
  /** Lượng mưa node đo (mm). */
  rainTotal: number;
  /** Thủy triều (cm, đúng như backend trả về; app hiển thị theo m). */
  tide: number;
  /** Lần cuối gửi dữ liệu cách đây bao nhiêu giây; null = chưa từng gửi. */
  secondsAgo: number | null;
}

/** Vị trí GIẢ của người dùng trong chế độ demo (gần Q.1) — để màn "Quanh bạn" có dữ liệu ở bất cứ đâu. */
export const DEMO_USER_POSITION = { latitude: 10.7815, longitude: 106.7045 };

export const demoStationSeeds: DemoStationSeed[] = [
  { nodeId: 'demo_q1_01', name: 'Demo – Nguyễn Hữu Cảnh (Q.1)', latitude: 10.7885, longitude: 106.7097, depth: 43.5, rainRate: 42, rainTotal: 61.5, tide: 152, secondsAgo: 20 },
  { nodeId: 'demo_q1_02', name: 'Demo – Tôn Đức Thắng (Q.1)', latitude: 10.7772, longitude: 106.7065, depth: 27.5, rainRate: 38, rainTotal: 55.0, tide: 152, secondsAgo: 45 },
  { nodeId: 'demo_q3_01', name: 'Demo – Võ Văn Tần (Q.3)', latitude: 10.7743, longitude: 106.6902, depth: 12.0, rainRate: 25, rainTotal: 33.5, tide: 140, secondsAgo: 120 },
  { nodeId: 'demo_bt_01', name: 'Demo – Ung Văn Khiêm (Bình Thạnh)', latitude: 10.8054, longitude: 106.716, depth: 3.0, rainRate: 12, rainTotal: 14.0, tide: 140, secondsAgo: 30 },
  { nodeId: 'demo_q4_01', name: 'Demo – Khánh Hội (Q.4, mất kết nối)', latitude: 10.7594, longitude: 106.699, depth: 30.0, rainRate: 0, rainTotal: 0, tide: 120, secondsAgo: 3 * 24 * 3600 },
  { nodeId: 'demo_q7_01', name: 'Demo – Huỳnh Tấn Phát (Q.7)', latitude: 10.7381, longitude: 106.7302, depth: 6.0, rainRate: 15, rainTotal: 18.5, tide: 165, secondsAgo: 60 },
  { nodeId: 'demo_td_01', name: 'Demo – Trạm mới (chưa có dữ liệu)', latitude: 10.8231, longitude: 106.7612, depth: null, rainRate: 0, rainTotal: 0, tide: 0, secondsAgo: null },
];

export const DEMO_THRESHOLDS = { warningCm: 10, dangerCm: 25, criticalCm: 40 };
const INFLUENCE_RADIUS_M: Record<string, number> = { normal: 0, warning: 100, danger: 200, critical: 300, unknown: 0 };

/** Xếp mức ngập giống hệt backend (src/domain/getFloodLevel.ts). */
export function demoFloodLevel(depth: number | null): string {
  if (depth === null) return 'unknown';
  if (depth >= DEMO_THRESHOLDS.criticalCm) return 'critical';
  if (depth >= DEMO_THRESHOLDS.dangerCm) return 'danger';
  if (depth >= DEMO_THRESHOLDS.warningCm) return 'warning';
  return 'normal';
}

/** Trạng thái kết nối giống backend với chu kỳ gửi 5 phút: ≤ 10 phút online, ≤ 30 phút chậm. */
function demoConnectionState(secondsAgo: number | null): string {
  if (secondsAgo === null) return 'nodata';
  if (secondsAgo <= 600) return 'online';
  if (secondsAgo <= 1800) return 'slow';
  return 'offline';
}

/** 1 trạm mẫu đúng định dạng backend (StationDto). `depthOverride` dùng cho giả lập realtime. */
export function buildDemoStation(seed: DemoStationSeed, now = Date.now(), depthOverride?: number) {
  const depth = depthOverride ?? seed.depth;
  const secondsAgo = depthOverride !== undefined ? 0 : seed.secondsAgo;
  const connectionState = demoConnectionState(secondsAgo);
  const level = demoFloodLevel(depth);
  const usable = depth !== null && (connectionState === 'online' || connectionState === 'slow');
  const measuredAt = secondsAgo === null ? null : new Date(now - secondsAgo * 1000).toISOString();
  return {
    nodeId: seed.nodeId,
    name: seed.name,
    address: '',
    latitude: seed.latitude,
    longitude: seed.longitude,
    thresholds: DEMO_THRESHOLDS,
    expectedIntervalSec: 300,
    isActive: true,
    connectionState,
    lastSeenAt: measuredAt,
    floodLevel: level,
    isFloodInfoUsable: usable,
    influenceRadiusM: usable ? INFLUENCE_RADIUS_M[level] : 0,
    predictedLevel: 'unknown',
    latest:
      depth === null || measuredAt === null
        ? null
        : {
            measuredAt,
            receivedAt: measuredAt,
            timeSource: 'device',
            floodDepthCm: depth,
            rainMm: seed.rainTotal,
            rainRateMmH: seed.rainRate,
            rainMm1h: null,
            tideCm: seed.tide,
            temperatureC: 28.4,
            humidityPct: null,
            lightLux: null,
            batteryPct: null,
            rssiDbm: null,
            predictedDepthCm: null,
            forecastMinutes: null,
            modelVersion: null,
            source: 'mqtt',
            extra: {},
          },
    model: null,
  };
}

/** Danh sách trạm mẫu đúng định dạng GET /api/v1/stations (phần "stations"). */
export function buildDemoStationList(now = Date.now()) {
  return demoStationSeeds.map((seed) => buildDemoStation(seed, now));
}
