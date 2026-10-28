import type { Station } from '@/types/Station';

/**
 * Trạm còn gửi dữ liệu gần đây không (online hoặc chậm dữ liệu)?
 *
 * Quan trọng: máy chủ KHÔNG tự xóa mức ngập cũ khi trạm mất kết nối, nên một trạm offline
 * nhiều tuần vẫn có thể mang mức "Nguy hiểm". App dùng hàm này để:
 *   - tô xám trạm có dữ liệu cũ và ghi rõ "dữ liệu cũ",
 *   - KHÔNG vẽ vùng ngập cho trạm có dữ liệu cũ.
 */
export function isStationDataFresh(station: Pick<Station, 'connectionState'>): boolean {
  return station.connectionState === 'online' || station.connectionState === 'slow';
}
