import { ApiError } from '@/api/ApiError';

import { buildDemoNearby } from './demoNearby';
import { buildDemoRouteCheck } from './demoRouteCheck';
import { buildDemoHistory } from './demoSensorHistory';
import { buildDemoStationList, demoStationSeeds } from './demoStations';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * "MÁY CHỦ GIẢ" cho chế độ DEMO: nhận đúng đường dẫn API của backend mới, trả về JSON đúng định dạng.
 * Được requestJson gọi thay cho mạng khi EXPO_PUBLIC_DEMO_MODE=true.
 */
export async function getDemoResponse(method: string, path: string, body: any): Promise<any> {
  await wait(250);
  const [pathname, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  const now = Date.now();
  const seg = (pathname ?? '').split('/').filter(Boolean); // ví dụ ["api","v1","stations","demo_q1_01","readings"]

  // Danh sách trạm
  if (pathname === '/api/v1/stations') {
    return { serverTime: new Date(now).toISOString(), stations: buildDemoStationList(now) };
  }

  // Lịch sử đo của 1 trạm
  if (seg[2] === 'stations' && seg[4] === 'readings') {
    const hours = Number(params.get('hours') || 24);
    return { nodeId: seg[3], readings: buildDemoHistory(seg[3] ?? '', hours, now) };
  }

  // Các phiên bản công thức của 1 trạm — giống trạm thật A01, A02: chưa có công thức nào
  if (seg[2] === 'stations' && seg[4] === 'models') {
    const seed = demoStationSeeds.find((s) => s.nodeId === seg[3]);
    if (!seed) throw new ApiError(`Không có trạm "${seg[3]}"`, 404);
    return { nodeId: seed.nodeId, models: [] };
  }

  // Quanh bạn
  if (pathname === '/api/v1/nearby') {
    return buildDemoNearby(Number(params.get('lat')), Number(params.get('lng')), Number(params.get('radius') || 2000));
  }

  // Kiểm tra tuyến
  if (pathname === '/api/v1/route/check' && method === 'POST') return buildDemoRouteCheck(body.start, body.end);

  throw new ApiError('Không có đường dẫn này (chế độ demo)', 404);
}
