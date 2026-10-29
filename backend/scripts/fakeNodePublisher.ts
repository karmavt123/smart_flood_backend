/**
 * GIẢ LẬP TRẠM ĐO — làm đúng việc 1 trạm ESP32 thật làm (gói tin bản 3.1, xem IOT_DATA_FORMAT.md),
 * để xem app/admin chạy ra sao khi chưa có trạm thật:
 *
 *   1. GỬI số đo lên topic smartflood/nodes/<id>/data:
 *        { "id": "TEST-A01", "date": "2026-10-29", "time": "14:05:30", "water_level_mm": 125,
 *          "predicted_water_level_mm": 137, "drain_mm_5min": 6.2, "rain_mm": 1.5, "tide_m": 1.35, "model_version": 2 }
 *      → LUÔN đủ 5 thành phần của công thức: H (water_level_mm), Ĥ sau 5 phút (predicted_water_level_mm),
 *        V (drain_mm_5min), R (rain_mm, mưa trong 5 phút), S (tide_m) — đúng như nhóm IoT gửi.
 *   2. NGHE topic smartflood/nodes/<id>/model: máy chủ học xong công thức mới thì gửi xuống,
 *      trạm giả nhận và DÙNG NGAY để tính Ĥ (kèm model_version).
 *      Chưa có công thức nào thì trạm giả TỰ TÍNH Ĥ bằng cách cho nước "chạy thử" 5 phút tới
 *      (vai trò của nhóm IoT tự tính) — không kèm model_version.
 *
 *   npm run fake-node                                   → 2 trạm thử TEST-A01, TEST-A02 quanh ĐH Bách Khoa, 5 giây gửi 1 lần
 *   npm run fake-node -- --lat 10.80 --lng 106.68       → đặt các trạm thử quanh vị trí khác (vd nhà/trường của bạn)
 *   npm run fake-node -- --interval 10                  → 10 giây gửi 1 lần
 *   npm run fake-node -- --url mqtt://host:1883 --username u --password p
 *
 * Trạm thật gửi 5 PHÚT 1 lần; trạm giả gửi 5 GIÂY 1 lần cho nhanh có dữ liệu. Thời gian vẫn là giờ thật,
 * nên chạy khoảng 15 phút là máy chủ đủ mẫu để bấm "Học lại ngay" ở trang admin.
 *
 * Đổi tọa độ (--lat/--lng) so với lần chạy trước: trạm giả tự DỜI 2 trạm thử tới chỗ mới qua API admin
 * (tin nhắn MQTT không được phép đổi vị trí trạm đã có — xem README backend, mục 2, Bước 4).
 *
 * CHỈ DÙNG VỚI BACKEND CHẠY THỬ TRÊN MÁY MÌNH. Mã trạm bắt đầu bằng "TEST-" và tin nhắn có "is_test": true,
 * để không ai nhầm dữ liệu giả với dữ liệu thật. Bấm Ctrl+C để dừng.
 */
import mqtt from 'mqtt';

import 'dotenv/config';

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
const apiUrl = readArg('api', `http://localhost:${process.env.PORT || 3000}`).replace(/\/+$/, '');
const adminKey = readArg('key', process.env.ADMIN_API_KEY || 'dev-admin-key');

/** Tốc độ dâng tính trên 5 phút, dự báo cho 5 phút tới — giống trạm thật. */
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/** Dời 1 điểm theo mét (bắc, đông). */
function offset(northM: number, eastM: number) {
  return {
    lat: centerLat + northM / 110540,
    lng: centerLng + eastM / (111320 * Math.cos((centerLat * Math.PI) / 180)),
  };
}

/** Công thức máy chủ gửi xuống: Ĥ(mm) = intercept + H·water_level_mm + V·drain_mm_5min + R·rain_mm + S·tide_m */
interface ReceivedModel {
  version: number;
  intercept: number;
  coef: Record<string, number>;
}

interface FakeNode {
  id: string;
  location: { lat: number; lng: number };
  /** Hệ số "địa hình": càng lớn càng dễ ngập. */
  terrain: number;
  /** Độ sâu nước ngập (cm). */
  depth: number;
  /** Lượng nước thoát qua cống từng lần gửi (mm), để cộng thành V = "thoát trong 5 phút gần nhất". */
  drainLog: { at: number; mm: number }[];
  /** Lượng mưa rơi xuống từng lần gửi, để cộng thành "mưa trong 5 phút gần nhất". */
  rainLog: { at: number; mm: number }[];
  /** Công thức đang dùng (máy chủ gửi xuống); null = chưa có, chưa dự báo. */
  model: ReceivedModel | null;
  /** true = vừa nhận công thức mới → gói tin kế tiếp gửi kèm cả "model" để máy chủ biết đã nhận. */
  announceModel: boolean;
}

// TEST-A01 ở chỗ trũng (dễ ngập), TEST-A02 ở chỗ cao hơn — giống 2 trạm thật A01, A02.
const nodes: FakeNode[] = [
  { id: 'TEST-A01', location: offset(300, 200), terrain: 1.8, depth: 0, drainLog: [], rainLog: [], model: null, announceModel: false },
  { id: 'TEST-A02', location: offset(-600, 900), terrain: 0.9, depth: 0, drainLog: [], rainLog: [], model: null, announceModel: false },
];

const client = mqtt.connect(url, { username: username || undefined, password: password || undefined });
const startedAt = Date.now();

/** Giờ Việt Nam hiện tại dạng "14:05:30". */
function vietnamClockNow(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
}

/** Ngày Việt Nam hiện tại dạng "2026-10-29". */
function vietnamDateNow(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/** Cộng các giá trị trong 5 phút gần nhất (bỏ bớt bản ghi cũ hơn). */
function sumLast5Minutes(log: { at: number; mm: number }[], now: number) {
  while (log.length > 0 && now - log[0]!.at >= FIVE_MINUTES_MS) log.shift();
  return log.reduce((sum, item) => sum + item.mm, 0);
}

/** Thời tiết giả ở giây thứ t: 1 "cơn mưa" 10 phút lặp lại; triều lên xuống chu kỳ 30 phút (rút ngắn cho dễ xem). */
function weatherAt(t: number) {
  return {
    rainRateMmH: Math.max(0, 70 * Math.sin((2 * Math.PI * t) / 600)),
    tideCm: 120 + 80 * Math.sin((2 * Math.PI * t) / 1800),
  };
}

/** Nước thay đổi qua 1 lần gửi: mưa + triều đổ vào, cống rút bớt. Trả về độ ngập mới (cm) và lượng thoát (cm). */
function stepDepth(depthCm: number, terrain: number, weather: { rainRateMmH: number; tideCm: number }) {
  const inflow = (weather.rainRateMmH / 60) * terrain * 1.2 + Math.max(0, weather.tideCm - 170) * 0.02 * terrain;
  const outflowCm = depthCm * 0.04;
  return { depthCm: Math.max(0, depthCm + inflow - outflowCm), outflowCm };
}

/** Trạm chưa có công thức: tự dự báo bằng cách cho nước "chạy thử" 5 phút tới với thời tiết giả (mm). */
function simulateIn5Minutes(node: FakeNode, t: number): number {
  let depthCm = node.depth;
  const steps = Math.max(1, Math.round(300 / intervalSec));
  for (let k = 1; k <= steps; k++) depthCm = stepDepth(depthCm, node.terrain, weatherAt(t + k * intervalSec)).depthCm;
  return depthCm * 10;
}

function tick() {
  const now = Date.now();
  const t = (now - startedAt) / 1000;
  const { rainRateMmH, tideCm } = weatherAt(t);
  const sent: string[] = [];

  for (const node of nodes) {
    const step = stepDepth(node.depth, node.terrain, { rainRateMmH, tideCm });
    const outflowCm = step.outflowCm; // nước thoát qua cống lần này
    node.depth = step.depthCm;
    const levelMm = Math.round(node.depth * 10);

    // V = nước thoát qua cống trong 5 phút gần nhất (mm/5 phút); R = mưa rơi trong 5 phút gần nhất (mm).
    node.drainLog.push({ at: now, mm: outflowCm * 10 });
    node.rainLog.push({ at: now, mm: (rainRateMmH / 3600) * intervalSec });
    const drainMm = sumLast5Minutes(node.drainLog, now);
    const rainMm = sumLast5Minutes(node.rainLog, now);

    const message: Record<string, unknown> = {
      id: node.id,
      date: vietnamDateNow(),
      time: vietnamClockNow(),
      water_level_mm: levelMm,
      drain_mm_5min: round(drainMm, 1),
      rain_mm: round(rainMm, 2),
      tide_m: round(tideCm / 100, 2),
      // 2 trường dưới trạm thật KHÔNG gửi: vị trí do admin nhập; is_test để đánh dấu dữ liệu giả.
      location: node.location,
      is_test: true,
    };
    // Ĥ sau 5 phút: có công thức máy chủ gửi thì dùng công thức đó; chưa có thì trạm tự tính.
    message.predicted_water_level_mm = Math.round(Math.max(0, simulateIn5Minutes(node, t)));
    if (node.model) {
      const c = node.model.coef;
      const predicted =
        node.model.intercept +
        (c.H ?? 0) * levelMm +
        (c.V ?? 0) * drainMm +
        (c.R ?? 0) * rainMm +
        (c.S ?? 0) * (tideCm / 100);
      message.predicted_water_level_mm = Math.round(Math.max(0, predicted));
      message.model_version = node.model.version;
      if (node.announceModel) {
        message.model = { version: node.model.version, horizon_min: 5, intercept: node.model.intercept, coef: node.model.coef };
        node.announceModel = false;
      }
    }
    client.publish(`smartflood/nodes/${node.id}/data`, JSON.stringify(message), { qos: 1 });
    sent.push(
      `${node.id}: H=${levelMm} → 5′ ${message.predicted_water_level_mm}mm, V=${round(drainMm, 1)}${node.model ? ` (v${node.model.version})` : ' (tự tính)'}`,
    );
  }
  console.log(`[fake-node] mưa ${round(rainRateMmH, 1)} mm/h, triều ${round(tideCm / 100, 2)} m │ ${sent.join(' │ ')}`);
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Nhận công thức máy chủ gửi xuống. Chỉ đổi khi số phiên bản LỚN HƠN bản đang dùng (gửi lại bản cũ thì bỏ qua). */
client.on('message', (topic, payload) => {
  const node = nodes.find((n) => topic === `smartflood/nodes/${n.id}/model`);
  if (!node) return;
  try {
    const model = JSON.parse(payload.toString('utf8')) as ReceivedModel;
    if (typeof model.version !== 'number' || typeof model.intercept !== 'number' || !model.coef) return;
    if (node.model && model.version <= node.model.version) return;
    node.model = { version: model.version, intercept: model.intercept, coef: model.coef };
    node.announceModel = true;
    console.log(`[fake-node] ${node.id} nhận công thức mới v${model.version} từ máy chủ → dùng ngay để dự báo`);
  } catch {
    console.warn(`[fake-node] Tin nhắn công thức ở ${topic} không phải JSON hợp lệ, bỏ qua`);
  }
});

/**
 * DỜI 2 TRẠM THỬ tới tọa độ mới. Backend cố ý không cho tin nhắn của trạm ghi đè vị trí đã có
 * (để vị trí admin nhập không bị trạm đè), nên trạm giả gọi API admin giống như người bấm "Xem / Sửa".
 * Trạm chưa có (404) thì bỏ qua: tin nhắn đầu tiên sẽ tự đặt vị trí.
 */
async function moveTestNodes() {
  for (const node of nodes) {
    try {
      const response = await fetch(`${apiUrl}/api/v1/admin/nodes/${encodeURIComponent(node.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ latitude: node.location.lat, longitude: node.location.lng }),
      });
      if (response.ok) console.log(`[fake-node] Đặt ${node.id} tại (${round(node.location.lat, 5)}, ${round(node.location.lng, 5)})`);
      else if (response.status !== 404) {
        console.warn(`[fake-node] Không dời được ${node.id} (mã ${response.status}) → trạm giữ vị trí cũ. Sai khóa admin? Thêm --key <ADMIN_API_KEY>`);
      }
    } catch {
      console.warn(`[fake-node] Không gọi được ${apiUrl} → nếu trạm đã có vị trí cũ thì giữ nguyên. Backend đã chạy chưa (npm run dev)?`);
      return;
    }
  }
}

let started = false;
client.on('connect', async () => {
  // Nghe công thức máy chủ gửi xuống (cả khi nối lại sau rớt mạng — tin "retained" sẽ tới ngay).
  for (const node of nodes) client.subscribe(`smartflood/nodes/${node.id}/model`, { qos: 1 });
  if (started) return; // MQTT tự nối lại sau khi rớt mạng → không chạy lại từ đầu (không nhân đôi lịch gửi)
  started = true;
  await moveTestNodes();
  console.log(`[fake-node] Đã nối ${url}. Gửi ${nodes.length} trạm thử quanh (${centerLat}, ${centerLng}) mỗi ${intervalSec} giây.`);
  console.log('[fake-node] Gói tin 3.1: H, dự báo sau 5 phút, V (thoát nước), R (mưa 5 phút), S (triều).');
  console.log('[fake-node] Chưa có công thức → trạm giả TỰ TÍNH dự báo. Chạy ~15 phút rồi bấm "Học lại ngay" ở admin để dùng công thức máy chủ.');
  tick();
  setInterval(tick, intervalSec * 1000);
});
client.on('error', (error) => console.error(`[fake-node] Lỗi MQTT: ${error.message} — backend đã chạy chưa (npm run dev)?`));
