import type { FloodedRoad } from '@/types/FloodedRoad';

/** Tên các con đường bị ngập quanh 1 trạm (không trùng, tối đa `max` tên), vd "Tôn Đức Thắng, Hàm Nghi". */
export function listRoadNames(roads: FloodedRoad[], nodeId: string, max = 3): string {
  const names = [...new Set(roads.filter((r) => r.nodeId === nodeId && r.roadName).map((r) => r.roadName as string))];
  if (names.length === 0) return '';
  return names.length > max ? `${names.slice(0, max).join(', ')}…` : names.join(', ');
}
