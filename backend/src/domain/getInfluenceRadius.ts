import { INFLUENCE_RADIUS_M } from '../config/floodRules.js';
import type { FloodLevel } from '../types/FloodLevel.js';

/** Bán kính vùng ảnh hưởng (m) theo mức ngập; dữ liệu đã cũ thì luôn 0 (không vẽ). */
export function getInfluenceRadius(level: FloodLevel, usable: boolean): number {
  return usable ? INFLUENCE_RADIUS_M[level] : 0;
}
