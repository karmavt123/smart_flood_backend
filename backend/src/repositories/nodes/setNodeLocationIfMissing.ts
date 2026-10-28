import { db } from '../../db/sharedDatabase.js';
import type { LatLng } from '../../types/LatLng.js';

/** Node gửi kèm tọa độ mà node CHƯA có vị trí thì lưu vào. Đã có vị trí (admin đặt) thì giữ nguyên. */
export async function setNodeLocationIfMissing(nodeId: string, location: LatLng) {
  await db().query(
    `UPDATE nodes SET latitude = $2, longitude = $3, updated_at = now()
     WHERE id = $1 AND (latitude IS NULL OR longitude IS NULL)`,
    [nodeId, location.latitude, location.longitude],
  );
}
