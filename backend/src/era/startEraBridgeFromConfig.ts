import { appConfig } from '../config/appConfig.js';
import { parseEraFieldMap } from './parseEraFieldMap.js';
import { startEraBridge } from './startEraBridge.js';

/** Các trường máy chủ đang BẮT BUỘC trong mỗi lần đo (ngoài độ ngập) — xem IOT_DATA_FORMAT.md mục 3.1. */
const REQUIRED_EXTRA_FIELDS = ['rain_mm', 'tide_m'] as const;

/**
 * BẬT CẦU NỐI E-RA nếu .env có ERA_GATEWAY_TOKEN (để trống = tắt, không in gì).
 * Kiểm tra cấu hình trước, sai thì backend dừng ngay kèm lý do rõ ràng (đỡ chạy rồi mới thấy không có dữ liệu).
 * Trả về hàm dừng cầu nối.
 */
export function startEraBridgeFromConfig(): () => void {
  const token = appConfig.eraGatewayToken;
  if (!token) return () => {};

  const nodeId = appConfig.eraNodeId;
  if (!nodeId) throw new Error('Đã đặt ERA_GATEWAY_TOKEN nhưng thiếu ERA_NODE_ID (mã trạm bên SmartFlood, vd A01).');
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(nodeId)) {
    throw new Error(`ERA_NODE_ID "${nodeId}" chỉ được gồm chữ không dấu, số, dấu - _ . (tối đa 64 ký tự).`);
  }
  if (!(appConfig.eraSaveIntervalSec >= 5)) throw new Error('ERA_SAVE_INTERVAL_SEC phải từ 5 giây trở lên.');

  const rules = parseEraFieldMap(appConfig.eraFieldMap);
  const targets = rules.map((rule) => rule.target as string);
  if (!targets.includes('water_level_mm')) {
    throw new Error('ERA_FIELD_MAP phải có 1 trường đổ vào water_level_mm (độ ngập), vd muc_nuoc=water_level_mm*10');
  }
  const missing = REQUIRED_EXTRA_FIELDS.filter((field) => !targets.includes(field));
  if (missing.length > 0) {
    console.warn(
      `[era] ⚠ ERA_FIELD_MAP chưa có ${missing.join(', ')}. Máy chủ đang BẮT BUỘC các trường này ` +
        '→ mọi số đo từ E-Ra sẽ bị TỪ CHỐI cho tới khi bổ sung (xem tab "Tin nhắn lỗi" trong trang admin).',
    );
  }

  return startEraBridge({
    url: appConfig.eraMqttUrl,
    token,
    nodeId,
    rules,
    saveIntervalSec: appConfig.eraSaveIntervalSec,
  });
}
