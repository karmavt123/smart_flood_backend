import type { FloodLevel } from '@/types/FloodLevel';
import type { Station } from '@/types/Station';

import { floodLevelRank } from './floodLevelRank';
import { isStationDataFresh } from './isStationDataFresh';

/**
 * CÓ NÊN BÁO ĐỘNG KHÔNG khi trạm vừa có dữ liệu mới?
 * Có, nếu dữ liệu còn mới, trạm đang từ mức Cảnh báo trở lên, VÀ mức ngập TĂNG so với lần trước
 * (vd An toàn → Cảnh báo, Cảnh báo → Nguy hiểm). Giữ nguyên mức hoặc giảm thì không báo lại, tránh làm phiền.
 * Chưa biết mức trước đó → chỉ báo khi đã từ Nguy hiểm trở lên.
 */
export function shouldRaiseFloodAlert(previous: FloodLevel | undefined, station: Station): boolean {
  if (!isStationDataFresh(station) || floodLevelRank(station.floodLevel) < floodLevelRank('warning')) return false;
  if (previous === undefined) return floodLevelRank(station.floodLevel) >= floodLevelRank('danger');
  return floodLevelRank(station.floodLevel) > floodLevelRank(previous);
}
