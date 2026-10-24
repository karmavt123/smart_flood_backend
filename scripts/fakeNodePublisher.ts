/**
 * GIẢ LẬP NODE — gửi dữ liệu THỬ qua MQTT giống hệt gateway LoRa, để xem app/admin chạy ra sao khi chưa có node thật.
 *
 *   npm run fake-node                                   → 4 node thử quanh ĐH Bách Khoa, 5 giây gửi 1 lần
 *   npm run fake-node -- --lat 10.80 --lng 106.68       → đặt các node thử quanh vị trí khác (vd nhà/trường của bạn)
 *   npm run fake-node -- --interval 10                  → 10 giây gửi 1 lần
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

/** Dời 1 điểm theo mét (bắc, đông). */
function offset(northM: number, eastM: number) {
  return {
    lat: centerLat + northM / 110540,
    lng: centerLng + eastM / (111320 * Math.cos((centerLat * Math.PI) / 180)),
  };
}

/** Công thức chung ban đầu (v1) theo báo cáo: dự đoán mực nước 5 phút tới từ H, V, T, RH, L. */
const BASE_MODEL = { intercept: 0.15, coef: { H: 0.985, V: 4.8, T: 0.002, RH: 0.001, L: -0.00001 } };
/** Giả sử sau 1 thời gian node TEST-01 (chỗ trũng) tự học lại ra công thức riêng (v2). */
const RETRAINED_MODEL = { intercept: 0.32, coef: { H: 0.972, V: 5.6, T: 0.001, RH: 0.002, L: 0 } };

interface FakeNode {
  id: string;
  location: { lat: number; lng: number };
  /** Hệ số "địa hình": càng lớn càng dễ ngập. */
  terrain: number;
  depth: number;
  previousDepth: number;
  sent: number;
}

const nodes: FakeNode[] = [
  { id: 'TEST-01', location: offset(300, 200), terrain: 1.8, depth: 0, previousDepth: 0, sent: 0 },
  { id: 'TEST-02', location: offset(-600, 900), terrain: 1.1, depth: 0, previousDepth: 0, sent: 0 },
  { id: 'TEST-03', location: offset(1400, -700), terrain: 0.35, depth: 0, previousDepth: 0, sent: 0 },
  { id: 'TEST-04', location: offset(-2600, -1500), terrain: 1.4, depth: 0, previousDepth: 0, sent: 0 },
];

const client = mqtt.connect(url, { username: username || undefined, password: password || undefined });
const startedAt = Date.now();

function tick() {
  const t = (Date.now() - startedAt) / 1000;
  // 1 "cơn mưa" giả kéo dài 10 phút rồi lặp lại; triều lên xuống chu kỳ 30 phút (rút ngắn cho dễ xem).
  const rain = Math.max(0, 70 * Math.sin((2 * Math.PI * t) / 600));
  const tide = 120 + 80 * Math.sin((2 * Math.PI * t) / 1800);

  for (const node of nodes) {
    node.previousDepth = node.depth;
    const inflow = (rain / 60) * node.terrain * 1.2 + Math.max(0, tide - 170) * 0.02 * node.terrain;
    node.depth = Math.max(0, node.depth + inflow - node.depth * 0.04);
    const temperature = 29 + 2 * Math.sin((2 * Math.PI * t) / 3600);
    const humidity = Math.min(100, 78 + rain / 4);
    const light = Math.max(0, 15000 - rain * 180);
    // Mỗi lần gửi coi như 1 "phút mô phỏng" (thời gian được tua nhanh) → tốc độ dâng V tính bằng cm/phút.
    const riseRate = node.depth - node.previousDepth;

    const useRetrained = node.id === 'TEST-01' && node.sent >= 30;
    const model = useRetrained ? RETRAINED_MODEL : BASE_MODEL;
    const predicted =
      model.intercept +
      model.coef.H * node.depth +
      model.coef.V * riseRate +
      model.coef.T * temperature +
      model.coef.RH * humidity +
      model.coef.L * light;

    const message = {
      node_id: node.id,
      measured_at: new Date().toISOString(),
      flood_depth_cm: round(node.depth),
      rain_mm_1h: round(rain),
      tide_cm: round(tide),
      temperature_c: round(temperature),
      humidity_pct: round(humidity),
      light_lux: Math.round(light),
      battery_pct: Math.max(5, 95 - Math.floor(node.sent / 20)),
      rssi_dbm: -85 - Math.round(Math.random() * 20),
      prediction: { depth_cm: round(Math.max(0, predicted)), horizon_min: 5 },
      model: {
        version: useRetrained ? 2 : 1,
        trained_at: useRetrained ? new Date(startedAt + 30 * intervalSec * 1000).toISOString() : '2026-10-01T00:00:00+07:00',
        samples: useRetrained ? 25920 : 0,
        horizon_min: 5,
        intercept: model.intercept,
        coef: model.coef,
        mae_cm: useRetrained ? 0.29 : 0.344,
        rmse_cm: useRetrained ? 0.38 : 0.439,
        r2: useRetrained ? 0.996 : 0.995,
      },
      location: node.location,
      is_test: true,
    };
    client.publish(`smartflood/nodes/${node.id}/data`, JSON.stringify(message), { qos: 1 });
    node.sent += 1;
  }
  const summary = nodes.map((n) => `${n.id}=${round(n.depth)}cm`).join('  ');
  console.log(`[fake-node] mưa ${round(rain)} mm/h, triều ${round(tide)} cm → ${summary}`);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

client.on('connect', () => {
  console.log(`[fake-node] Đã nối ${url}. Gửi 4 node thử quanh (${centerLat}, ${centerLng}) mỗi ${intervalSec} giây.`);
  tick();
  setInterval(tick, intervalSec * 1000);
});
client.on('error', (error) => console.error(`[fake-node] Lỗi MQTT: ${error.message} — backend đã chạy chưa (npm run dev)?`));
