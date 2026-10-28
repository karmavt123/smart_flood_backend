import { db } from '../../db/sharedDatabase.js';
import type { NodeModelRecord } from '../../types/NodeModelRecord.js';

/**
 * Với mỗi node: phiên bản công thức mới nhất, NẾU phiên bản đó do máy chủ học.
 * (Trạm đã tự gửi lên phiên bản mới hơn thì bản của máy chủ đã cũ, không gửi lại nữa.)
 * Dùng khi MQTT vừa nối lại: gửi lại hệ số cho trạm, phòng broker khởi động lại bị mất tin "retained".
 */
export async function listLatestServerModels(): Promise<NodeModelRecord[]> {
  return db().query<NodeModelRecord>(
    `SELECT m.* FROM node_models m
     JOIN (SELECT node_id, MAX(version) AS version FROM node_models GROUP BY node_id) latest
       ON latest.node_id = m.node_id AND latest.version = m.version
     WHERE m.source = 'server'
     ORDER BY m.node_id`,
  );
}
