import { Polyline } from 'react-leaflet';

import { floodLevelStyles } from '@/constants/floodLevelStyles';
import type { FloodedRoad } from '@/types/FloodedRoad';

/** TÔ MÀU CÁC ĐOẠN ĐƯỜNG BỊ NGẬP trên bản đồ WEB (Leaflet) — giống bản điện thoại: viền trắng + màu ngập. */
export function FloodedRoadLines({ roads }: { roads: FloodedRoad[] }) {
  const toPositions = (road: FloodedRoad) => road.path.map((p) => [p.latitude, p.longitude] as [number, number]);
  return (
    <>
      {roads.map((road, index) => (
        <Polyline
          key={`casing-${index}`}
          positions={toPositions(road)}
          pathOptions={{ color: '#FFFFFF', weight: 9, lineCap: 'round', opacity: 0.9 }}
          interactive={false}
        />
      ))}
      {roads.map((road, index) => (
        <Polyline
          key={`road-${index}`}
          positions={toPositions(road)}
          pathOptions={{ color: floodLevelStyles[road.level].color, weight: 6, lineCap: 'round', opacity: 0.95 }}
          interactive={false}
        />
      ))}
    </>
  );
}
