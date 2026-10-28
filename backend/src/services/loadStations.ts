import { toStationDto } from '../mappers/toStationDto.js';
import { listStationRows } from '../repositories/nodes/listStationRows.js';
import type { StationDto } from '../types/StationDto.js';

/**
 * LẤY DANH SÁCH TRẠM đã tính sẵn tình trạng (dùng cho app, trang admin, kiểm tra tuyến, "Quanh bạn").
 *   includeInactive: true = lấy cả node đã ẩn (chỉ trang admin dùng)
 *   nodeId: chỉ lấy 1 node
 */
export async function loadStations(options: { includeInactive?: boolean; nodeId?: string } = {}): Promise<StationDto[]> {
  const rows = await listStationRows({ includeInactive: options.includeInactive ?? false, nodeId: options.nodeId });
  const now = new Date();
  return rows.map((row) => toStationDto(row, now));
}
