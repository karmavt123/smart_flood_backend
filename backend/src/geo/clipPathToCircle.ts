import type { LatLng } from '../types/LatLng.js';
import { fromLocalMeters, toLocalMeters } from './toLocalMeters.js';

type Point = { x: number; y: number };

/**
 * Phần của đoạn P→Q nằm TRONG hình tròn tâm (0,0) bán kính r, trả về [tBắtĐầu, tKếtThúc] (0..1)
 * hoặc null nếu đoạn nằm hẳn ngoài. Giải phương trình |P + t(Q−P)|² = r² (phương trình bậc 2 theo t).
 */
function insideSpan(p: Point, q: Point, r: number): [number, number] | null {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const a = dx * dx + dy * dy;
  const c = p.x * p.x + p.y * p.y - r * r;
  if (a === 0) return c <= 0 ? [0, 1] : null;
  const b = 2 * (p.x * dx + p.y * dy);
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const sqrt = Math.sqrt(discriminant);
  const start = Math.max(0, (-b - sqrt) / (2 * a));
  const end = Math.min(1, (-b + sqrt) / (2 * a));
  return start < end ? [start, end] : null;
}

const lerp = (p: Point, q: Point, t: number): Point => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

/**
 * CẮT 1 CON ĐƯỜNG theo hình tròn: chỉ giữ những đoạn nằm trong vòng tròn tâm `center` bán kính `radiusM`.
 * 1 con đường có thể đi ra vào vòng tròn nhiều lần → trả về nhiều đoạn.
 * Dùng để tô màu: chỉ phần đường nằm trong vùng ảnh hưởng của node đang ngập mới được tô.
 */
export function clipPathToCircle(path: LatLng[], center: LatLng, radiusM: number): LatLng[][] {
  const points = path.map((p) => toLocalMeters(p, center));
  const pieces: Point[][] = [];
  let current: Point[] | null = null;

  for (let i = 0; i + 1 < points.length; i += 1) {
    const p = points[i]!;
    const q = points[i + 1]!;
    const span = insideSpan(p, q, radiusM);
    if (!span) {
      if (current) pieces.push(current);
      current = null;
      continue;
    }
    const [start, end] = span;
    const enter = lerp(p, q, start);
    const exit = lerp(p, q, end);
    // Đoạn trước kết thúc ở trong vòng và đoạn này bắt đầu từ đầu → nối tiếp, không tách.
    if (current && start === 0) current.push(exit);
    else {
      if (current) pieces.push(current);
      current = [enter, exit];
    }
    if (end < 1) {
      pieces.push(current);
      current = null;
    }
  }
  if (current) pieces.push(current);

  return pieces.filter((piece) => piece.length >= 2).map((piece) => piece.map((p) => fromLocalMeters(p, center)));
}
