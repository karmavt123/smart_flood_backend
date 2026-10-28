import { db } from '../../db/sharedDatabase.js';
import type { ReadingRecord } from '../../types/ReadingRecord.js';

/**
 * LỊCH SỬ ĐO của 1 node trong khoảng [from, to], tối đa `limit` lần đo MỚI NHẤT,
 * trả về theo thứ tự thời gian tăng dần (cũ → mới) để vẽ biểu đồ.
 * (Backend cũ lấy giới hạn TRƯỚC rồi mới sắp xếp nên thiếu dữ liệu mới — ở đây sắp xếp trước.)
 */
export async function listReadings(nodeId: string, from: Date, to: Date, limit: number): Promise<ReadingRecord[]> {
  return db().query<ReadingRecord>(
    `SELECT * FROM (
       SELECT * FROM readings
       WHERE node_id = $1 AND measured_at >= $2 AND measured_at <= $3
       ORDER BY measured_at DESC
       LIMIT $4
     ) newest
     ORDER BY measured_at ASC`,
    [nodeId, from, to, limit],
  );
}
