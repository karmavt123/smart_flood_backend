import type { FloodLevel } from '@/types/FloodLevel';

const RANK: Record<FloodLevel, number> = { unknown: -1, normal: 0, warning: 1, danger: 2, critical: 3 };

/** Thứ hạng của mức ngập để so sánh: An toàn 0 < Cảnh báo 1 < Nguy hiểm 2 < Rất nguy hiểm 3 (chưa có dữ liệu = −1). */
export function floodLevelRank(level: FloodLevel): number {
  return RANK[level];
}
