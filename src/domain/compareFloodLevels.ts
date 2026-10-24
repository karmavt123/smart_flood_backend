import type { FloodLevel } from '../types/FloodLevel.js';

const ORDER: Record<FloodLevel, number> = { unknown: -1, normal: 0, warning: 1, danger: 2, critical: 3 };

/** Trả về mức nặng hơn trong 2 mức. Ví dụ worseFloodLevel('warning', 'critical') = 'critical'. */
export function worseFloodLevel(a: FloodLevel, b: FloodLevel): FloodLevel {
  return ORDER[a] >= ORDER[b] ? a : b;
}
