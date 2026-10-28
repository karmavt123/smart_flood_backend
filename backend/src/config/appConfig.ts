import 'dotenv/config';

/** Đọc 1 biến môi trường dạng chữ (đã bỏ khoảng trắng 2 đầu); không có thì lấy giá trị mặc định. */
function readText(name: string, fallback = ''): string {
  return (process.env[name] ?? fallback).trim();
}

/** Đọc 1 biến môi trường dạng số; để trống thì lấy mặc định, ghi sai thì báo lỗi ngay khi khởi động. */
function readNumber(name: string, fallback: number): number {
  const raw = readText(name);
  if (raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Biến môi trường ${name} phải là số, đang là "${raw}"`);
  return value;
}

/**
 * TOÀN BỘ CẤU HÌNH của backend, đọc từ file .env (xem .env.example để biết ý nghĩa từng biến).
 * Code chỗ khác chỉ đọc từ đây, không đọc process.env trực tiếp.
 */
export const appConfig = {
  isProduction: process.env.NODE_ENV === 'production',
  port: readNumber('PORT', 3000),

  databaseUrl: readText('DATABASE_URL'),
  embeddedDbDir: readText('EMBEDDED_DB_DIR', './data/pglite'),

  mqttUrl: readText('MQTT_URL'),
  mqttUsername: readText('MQTT_USERNAME'),
  mqttPassword: readText('MQTT_PASSWORD'),
  mqttTopic: readText('MQTT_TOPIC', 'smartflood/nodes/+/data'),
  embeddedMqttHost: readText('EMBEDDED_MQTT_HOST', '127.0.0.1'),
  embeddedMqttPort: readNumber('EMBEDDED_MQTT_PORT', 1883),

  adminApiKey: readText('ADMIN_API_KEY'),

  osrmUrl: readText('OSRM_URL', 'https://router.project-osrm.org').replace(/\/+$/, ''),
  overpassUrl: readText('OVERPASS_URL', 'https://overpass-api.de/api/interpreter'),

  corsOrigin: readText('CORS_ORIGIN', '*'),
  trustProxy: readText('TRUST_PROXY') === 'true',

  // --- Máy chủ học lại công thức dự đoán (xem src/training/) ---
  /** false = tắt tự học mỗi ngày (vẫn bấm "Học lại ngay" ở trang admin được). */
  modelAutoRetrain: readText('MODEL_AUTO_RETRAIN', 'true') !== 'false',
  /** Giờ tự học mỗi ngày, theo giờ Việt Nam, dạng "HH:MM". */
  modelRetrainTime: readText('MODEL_RETRAIN_TIME', '00:30'),
  /** Học từ dữ liệu bao nhiêu ngày gần nhất. */
  modelTrainingDays: readNumber('MODEL_TRAINING_DAYS', 30),
  /** Cần ít nhất bao nhiêu cặp mẫu ĐANG NGẬP mới học (30 cặp × 5 phút = 2,5 giờ ngập). */
  modelMinSamples: readNumber('MODEL_MIN_SAMPLES', 30),
  /** Hệ số cũ nặng bao nhiêu so với dữ liệu mới: 0 = bỏ hẳn hệ số cũ, 1 = ngang với toàn bộ dữ liệu mới. */
  modelPriorWeight: readNumber('MODEL_PRIOR_WEIGHT', 0.2),

  // --- Cầu nối E-Ra (EoH): máy chủ tự nghe broker E-Ra để lấy số đo của trạm dùng nền tảng E-Ra (xem src/era/) ---
  /** Token của gateway E-Ra. Để trống = tắt cầu nối E-Ra. BÍ MẬT: không đưa lên GitHub. */
  eraGatewayToken: readText('ERA_GATEWAY_TOKEN'),
  /** Broker MQTT của E-Ra. */
  eraMqttUrl: readText('ERA_MQTT_URL', 'mqtt://mqtt1.eoh.io:1883'),
  /** Mã trạm bên SmartFlood nhận dữ liệu của gateway này, vd "A01". */
  eraNodeId: readText('ERA_NODE_ID'),
  /** Trường E-Ra → trường gói tin SmartFlood, vd "muc_nuoc=water_level_mm*10,mua=rain_mm" (xem parseEraFieldMap.ts). */
  eraFieldMap: readText('ERA_FIELD_MAP'),
  /** Lưu tối đa 1 lần đo mỗi bao nhiêu giây (trạm E-Ra hay gửi vài giây 1 lần, lưu hết thì DB phình to). */
  eraSaveIntervalSec: readNumber('ERA_SAVE_INTERVAL_SEC', 60),
};
