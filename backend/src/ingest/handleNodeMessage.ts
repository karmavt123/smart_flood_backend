import { isFloodingLevel } from '../domain/isFloodingLevel.js';
import { broadcastStationUpdate } from '../realtime/realtimeHub.js';
import { insertIngestError } from '../repositories/errors/insertIngestError.js';
import { insertNodeModel } from '../repositories/models/insertNodeModel.js';
import { markModelApplied } from '../repositories/models/markModelApplied.js';
import { ensureNodeExists } from '../repositories/nodes/ensureNodeExists.js';
import { setNodeLocationIfMissing } from '../repositories/nodes/setNodeLocationIfMissing.js';
import { touchNodeLastMessage } from '../repositories/nodes/touchNodeLastMessage.js';
import { insertReading } from '../repositories/readings/insertReading.js';
import { getFloodedRoadsForStation } from '../roads/getFloodedRoadsForStation.js';
import { loadStations } from '../services/loadStations.js';
import { IngestRejection } from './IngestRejection.js';
import type { IngestResult } from './IngestResult.js';
import { parseNodeMessage } from './parseNodeMessage.js';

const MAX_PAYLOAD_BYTES = 16 * 1024;

interface IncomingMessage {
  /** mqtt = trạm gửi trực tiếp; admin-test = gửi thử ở trang admin; import = nhập dữ liệu cũ. */
  channel: 'mqtt' | 'admin-test' | 'import';
  topic: string | null;
  nodeIdFromTopic: string | null;
  /** Nội dung tin nhắn: chuỗi JSON (MQTT) hoặc object đã đọc sẵn (import). */
  payload: string | unknown;
}

/**
 * XỬ LÝ 1 TIN NHẮN CỦA NODE — từ lúc nhận tới lúc app thấy:
 *   1. Đọc JSON, kiểm tra đúng khuôn (sai → ghi vào ingest_errors kèm lý do).
 *   2. Node lạ → tự tạo node mới. Có tọa độ mà node chưa có vị trí → lưu vị trí.
 *   3. Lưu lần đo (trùng thì bỏ qua) và phiên bản công thức (nếu node gửi kèm).
 *   4. Tin nhắn trực tiếp → cập nhật "lần cuối nhận" + đẩy realtime cho app;
 *      node đang ngập → tải sẵn hình dạng đường quanh node để màn "Quanh bạn" mở nhanh.
 */
export async function handleNodeMessage(incoming: IncomingMessage): Promise<IngestResult> {
  const receivedAt = new Date();
  const isLive = incoming.channel !== 'import';
  const payloadText = typeof incoming.payload === 'string' ? incoming.payload : JSON.stringify(incoming.payload);

  try {
    if (Buffer.byteLength(payloadText, 'utf8') > MAX_PAYLOAD_BYTES) {
      throw new IngestRejection(`Tin nhắn quá lớn (tối đa ${MAX_PAYLOAD_BYTES / 1024} KB)`);
    }
    let body: unknown = incoming.payload;
    if (typeof incoming.payload === 'string') {
      try {
        body = JSON.parse(incoming.payload);
      } catch (error) {
        throw new IngestRejection(`Không phải JSON hợp lệ: ${(error as Error).message}`);
      }
    }

    const message = parseNodeMessage(body, {
      nodeIdFromTopic: incoming.nodeIdFromTopic,
      receivedAt,
      mustHaveDeviceTime: !isLive,
    });

    await ensureNodeExists(message.nodeId);
    if (message.location) await setNodeLocationIfMissing(message.nodeId, message.location);
    const saved = await insertReading(message, incoming.channel, receivedAt);
    const newModel = message.model ? await insertNodeModel(message.nodeId, message.model) : false;

    if (isLive) {
      await touchNodeLastMessage(message.nodeId, receivedAt);
      // Trạm báo đang dùng phiên bản nào → biết hệ số máy chủ gửi xuống đã tới trạm chưa.
      if (message.modelVersion) await markModelApplied(message.nodeId, message.modelVersion, receivedAt);
      const [station] = await loadStations({ includeInactive: true, nodeId: message.nodeId });
      if (station?.isActive) {
        broadcastStationUpdate(station);
        if (station.isFloodInfoUsable && isFloodingLevel(station.floodLevel)) void getFloodedRoadsForStation(station);
      }
    }

    return {
      ok: true,
      nodeId: message.nodeId,
      status: saved ? 'saved' : 'duplicate',
      newModelVersion: newModel ? message.model!.version : null,
    };
  } catch (error) {
    if (!(error instanceof IngestRejection)) throw error; // lỗi DB... → để nơi gọi ghi log
    if (isLive) await insertIngestError(incoming.channel, incoming.topic, payloadText, error.message);
    return { ok: false, reason: error.message };
  }
}
