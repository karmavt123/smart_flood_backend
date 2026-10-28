import { clipPathToCircle } from '../geo/clipPathToCircle.js';
import type { FloodedRoad } from '../types/FloodedRoad.js';
import type { StationDto } from '../types/StationDto.js';
import { fetchRoadsAround, type RoadShape } from './fetchRoadsAround.js';

/** Đường xá ít thay đổi → nhớ kết quả 12 giờ. Lấy lỗi thì 2 phút sau mới thử lại (tránh gọi Overpass dồn dập). */
const CACHE_OK_MS = 12 * 60 * 60 * 1000;
const CACHE_FAIL_MS = 2 * 60 * 1000;

interface CacheEntry {
  savedAt: number;
  roads: RoadShape[] | null; // null = lần lấy trước bị lỗi
}
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<RoadShape[] | null>>();

/** Lấy đường quanh node (có nhớ tạm). Trả về null nếu không lấy được. */
async function getRoadShapes(station: StationDto): Promise<RoadShape[] | null> {
  const key = `${station.latitude},${station.longitude},${station.influenceRadiusM}`;
  const saved = cache.get(key);
  if (saved && Date.now() - saved.savedAt < (saved.roads ? CACHE_OK_MS : CACHE_FAIL_MS)) return saved.roads;

  const running = inFlight.get(key);
  if (running) return running;
  const task = fetchRoadsAround({ latitude: station.latitude!, longitude: station.longitude! }, station.influenceRadiusM)
    .catch((error: unknown) => {
      console.warn(`[roads] Không lấy được đường quanh ${station.nodeId}: ${(error as Error).message}`);
      return null;
    })
    .then((roads) => {
      cache.set(key, { savedAt: Date.now(), roads });
      inFlight.delete(key);
      return roads;
    });
  inFlight.set(key, task);
  return task;
}

/**
 * CÁC ĐOẠN ĐƯỜNG BỊ NGẬP quanh 1 node đang ngập: lấy đường trong vùng ảnh hưởng rồi cắt đúng theo vòng tròn.
 * Trả về null nếu không lấy được dữ liệu đường (app sẽ vẽ vòng tròn thay thế).
 */
export async function getFloodedRoadsForStation(station: StationDto): Promise<FloodedRoad[] | null> {
  if (station.latitude === null || station.longitude === null || station.influenceRadiusM <= 0) return [];
  const shapes = await getRoadShapes(station);
  if (!shapes) return null;
  const center = { latitude: station.latitude, longitude: station.longitude };
  return shapes.flatMap((road) =>
    clipPathToCircle(road.path, center, station.influenceRadiusM).map((path) => ({
      nodeId: station.nodeId,
      level: station.floodLevel,
      roadName: road.name,
      path,
    })),
  );
}
