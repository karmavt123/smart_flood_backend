/**
 * GIẢ LẬP NODE — gửi dữ liệu THỬ qua MQTT giống hệt gateway LoRa, để xem app/admin chạy ra sao khi chưa có node thật.
 * Gửi ĐÚNG KIỂU GÓI TIN bên IoT đã chốt (xem IOT_DATA_FORMAT.md):
 *   { "id": "TEST-A01", "time": "14:05:30", "water_level_mm": 125, "rain_mm": 12.5,
 *     "rain_rate_mm_s": 0.004, "tide_m": 1.35, "temperature_c": 29.4, ... }
 *
 *   npm run fake-node                                   → 2 node thử TEST-A01, TEST-A02 quanh ĐH Bách Khoa, 5 giây gửi 1 lần
 *   npm run fake-node -- --lat 10.80 --lng 106.68       → đặt các node thử quanh vị trí khác (vd nhà/trường của bạn)
 *   npm run fake-node -- --interval 10                  → 10 giây gửi 1 lần
 *   npm run fake-node -- --with-model                   → gửi kèm dự đoán + công thức (thử trường hợp node tự học, cách A)
 *   npm run fake-node -- --url mqtt://host:1883 --username u --password p
 *
 * CHỈ DÙNG VỚI BACKEND CHẠY THỬ TRÊN MÁY MÌNH. Mã node bắt đầu bằng "TEST-" và tin nhắn có "is_test": true,
 * để không ai nhầm dữ liệu giả với dữ liệu thật. Bấm Ctrl+C để dừng.
 */
import mqtt from 'mqtt';

function readArg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback;
}

const centerLat = Number(readArg('lat', '10.7726'));
const centerLng = Number(readArg('lng', '106.6579'));
const intervalSec = Number(readArg('interval', '5'));
const url = readArg('url', 'mqtt://127.0.0.1:1883');
const username = readArg('username', '');
const password = readArg('password', '');
const withModel = process.argv.includes('--with-model');

/** Dời 1 điểm theo mét (bắc, đông). */
function offset(northM: number, eastM: number) {
  return {
    lat: centerLat + northM / 110540,
    lng: centerLng + eastM / (111320 * Math.cos((centerLat * Math.PI) / 180)),
  };
}

/** Chỉ dùng khi --with-model: công thức chung ban đầu (v1) theo báo cáo. */
const BASE_MODEL = { intercept: 0.15, coef: { H: 0.985, V: 4.8, T: 0.002 } };

interface FakeNode {
  id: string;
  location: { lat: number; lng: number };
  /** Hệ số "địa hình": càng lớn càng dễ ngập. */
  terrain: number;
  /** Độ sâu nước ngập (cm). */
  depth: number;
  previousDepth: number;
  /** Lượng mưa cộng dồn từ lúc node bật (mm). */
  rainTotal: number;
}

// TEST-A01 ở chỗ trũng (dễ ngập), TEST-A02 ở chỗ cao hơn — giống 2 trạm thật A01, A02.
const nodes: FakeNode[] = [
  { id: 'TEST-A01', location: offset(300, 200), terrain: 1.8, depth: 0, previousDepth: 0, rainTotal: 0 },
  { id: 'TEST-A02', location: offset(-600, 900), terrain: 0.9, depth: 0, previousDepth: 0, rainTotal: 0 },
];

const client = mqtt.connect(url, { username: username || undefined, password: password || undefined });
const startedAt = Date.now();

/** Giờ Việt Nam hiện tại dạng "14:05:30" — node thật chỉ gửi giờ, không có ngày. */
function vietnamClockNow(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
}

function tick() {
  const t = (Date.now() - startedAt) / 1000;
  // 1 "cơn mưa" giả kéo dài 10 phút rồi lặp lại; triều lên xuống chu kỳ 30 phút (rút ngắn cho dễ xem).
  const rainRateMmH = Math.max(0, 70 * Math.sin((2 * Math.PI * t) / 600));
  const tideCm = 120 + 80 * Math.sin((2 * Math.PI * t) / 1800);
  const temperature = 29 + 2 * Math.sin((2 * Math.PI * t) / 3600);

  for (const node of nodes) {
    node.previousDepth = node.depth;
    const inflow = (rainRateMmH / 60) * node.terrain * 1.2 + Math.max(0, tideCm - 170) * 0.02 * node.terrain;
    node.depth = Math.max(0, node.depth + inflow - node.depth * 0.04);
    // Mỗi lần gửi coi như 1 "phút mô phỏng" (thời gian được tua nhanh).
    node.rainTotal += rainRateMmH / 60;

    const message: Record<string, unknown> = {
      id: node.id,
      time: vietnamClockNow(),
      water_level_mm: Math.round(node.depth * 10),
      rain_mm: round(node.rainTotal, 1),
      rain_rate_mm_s: round(rainRateMmH / 3600, 5),
      tide_m: round(tideCm / 100, 2),
      temperature_c: round(temperature, 1),
      // 2 trường dưới node thật KHÔNG gửi: vị trí do admin nhập; is_test để đánh dấu dữ liệu giả.
      location: node.location,
      is_test: true,
    };
    if (withModel) {
      const riseRate = node.depth - node.previousDepth; // cm / phút mô phỏng
      const predicted =
        BASE_MODEL.intercept + BASE_MODEL.coef.H * node.depth + BASE_MODEL.coef.V * riseRate + BASE_MODEL.coef.T * temperature;
      message.prediction = { depth_cm: round(Math.max(0, predicted), 1), horizon_min: 5 };
      message.model = { version: 1, horizon_min: 5, intercept: BASE_MODEL.intercept, coef: BASE_MODEL.coef };
    }
    client.publish(`smartflood/nodes/${node.id}/data`, JSON.stringify(message), { qos: 1 });
  }
  const summary = nodes.map((n) => `${n.id}=${Math.round(n.depth * 10)}mm`).join('  ');
  console.log(`[fake-node] mưa ${round(rainRateMmH, 1)} mm/h, triều ${round(tideCm / 100, 2)} m → ${summary}`);
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

client.on('connect', () => {
  console.log(
    `[fake-node] Đã nối ${url}. Gửi ${nodes.length} node thử quanh (${centerLat}, ${centerLng}) mỗi ${intervalSec} giây` +
      (withModel ? ', có kèm dự đoán + công thức.' : '.'),
  );
  tick();
  setInterval(tick, intervalSec * 1000);
});
client.on('error', (error) => console.error(`[fake-node] Lỗi MQTT: ${error.message} — backend đã chạy chưa (npm run dev)?`));
