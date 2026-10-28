import { appConfig } from '../config/appConfig.js';
import type { LatLng } from '../types/LatLng.js';

export interface RoadShape {
  name: string | null;
  path: LatLng[];
}

/** Các loại đường xe máy / ô tô đi được (bỏ đường cao tốc trên cao, lối đi bộ, cầu thang). */
const ROAD_TYPES =
  '^(trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian|trunk_link|primary_link|secondary_link|tertiary_link)$';

/**
 * LẤY HÌNH DẠNG CÁC CON ĐƯỜNG trong bán kính `radiusM` quanh 1 điểm, từ OpenStreetMap (dịch vụ Overpass, miễn phí).
 * Trả về danh sách đường, mỗi đường là 1 dãy tọa độ. Lỗi mạng / quá 20 giây thì ném lỗi.
 */
export async function fetchRoadsAround(center: LatLng, radiusM: number): Promise<RoadShape[]> {
  const query =
    `[out:json][timeout:20];` +
    `way(around:${Math.round(radiusM)},${center.latitude},${center.longitude})[highway~"${ROAD_TYPES}"];` +
    `out tags geom;`;
  const response = await fetch(appConfig.overpassUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'SmartFlood/1.0 (du an khoa hoc ky thuat hoc sinh)',
    },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Overpass trả về mã ${response.status}`);
  const data = (await response.json()) as {
    elements?: { type: string; tags?: { name?: string }; geometry?: { lat: number; lon: number }[] }[];
  };
  return (data.elements ?? [])
    .filter((element) => element.type === 'way' && (element.geometry?.length ?? 0) >= 2)
    .map((element) => ({
      name: element.tags?.name ?? null,
      path: element.geometry!.map((point) => ({ latitude: point.lat, longitude: point.lon })),
    }));
}
