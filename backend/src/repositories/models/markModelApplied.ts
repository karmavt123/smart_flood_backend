import { db } from '../../db/sharedDatabase.js';

/**
 * Trạm gửi số đo có ghi "đang dùng phiên bản X" → đánh dấu phiên bản X đã được trạm áp dụng
 * (chỉ ghi lần đầu). Nhờ vậy admin biết hệ số máy chủ gửi xuống đã tới trạm chưa.
 */
export async function markModelApplied(nodeId: string, version: number, at: Date): Promise<void> {
  await db().query(
    'UPDATE node_models SET applied_at = $3 WHERE node_id = $1 AND version = $2 AND applied_at IS NULL',
    [nodeId, version, at],
  );
}
