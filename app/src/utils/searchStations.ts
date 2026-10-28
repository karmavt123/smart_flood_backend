import type { Station } from '@/types/Station';

/** Bỏ dấu tiếng Việt để tìm "quan 1" vẫn ra "Quận 1". */
function removeVietnameseMarks(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Tìm trạm theo tên hoặc mã trạm (không phân biệt hoa thường, có dấu hay không dấu). */
export function searchStations(stations: Station[], keyword: string): Station[] {
  const q = removeVietnameseMarks(keyword.trim());
  if (!q) return stations;
  return stations.filter(
    (s) => removeVietnameseMarks(s.name).includes(q) || removeVietnameseMarks(s.nodeId).includes(q),
  );
}
