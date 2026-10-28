/** Một điểm trên biểu đồ: thời gian (mili giây) và giá trị. */
export interface ChartPoint {
  timeMs: number;
  value: number;
}

/**
 * Chia dãy điểm thành nhiều đoạn, cắt ở chỗ THIẾU DỮ LIỆU, để biểu đồ không nối đường qua
 * khoảng trống (yêu cầu FR-07).
 *
 * Cách làm: tính khoảng cách thời gian "bình thường" giữa 2 lần đo (trung vị). Hai điểm liên tiếp
 * cách nhau quá xa (hơn 3 lần bình thường và hơn 15 phút) thì coi là bị thiếu dữ liệu ở giữa.
 */
export function splitSeriesAtGaps(points: ChartPoint[]): ChartPoint[][] {
  if (points.length < 2) return points.length ? [points] : [];

  const gaps = points.slice(1).map((p, i) => p.timeMs - points[i].timeMs).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  const maxGapMs = Math.max(median * 3, 15 * 60 * 1000);

  const segments: ChartPoint[][] = [[points[0]]];
  for (let i = 1; i < points.length; i++) {
    if (points[i].timeMs - points[i - 1].timeMs > maxGapMs) segments.push([]);
    segments[segments.length - 1].push(points[i]);
  }
  return segments;
}
