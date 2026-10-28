import { Polyline } from 'react-native-maps';

import { floodLevelStyles } from '@/constants/floodLevelStyles';
import type { FloodedRoad } from '@/types/FloodedRoad';

/**
 * TÔ MÀU CÁC ĐOẠN ĐƯỜNG BỊ NGẬP trên bản đồ điện thoại (màu theo mức ngập của trạm gần đó).
 * Mỗi đoạn vẽ 2 lớp: viền trắng bên dưới cho nổi trên nền bản đồ, màu ngập bên trên.
 * Bản web nằm ở FloodedRoadLines.web.tsx.
 */
export function FloodedRoadLines({ roads }: { roads: FloodedRoad[] }) {
  return (
    <>
      {roads.map((road, index) => (
        <Polyline key={`casing-${index}`} coordinates={road.path} strokeColor="#FFFFFF" strokeWidth={9} lineCap="round" zIndex={2} />
      ))}
      {roads.map((road, index) => (
        <Polyline
          key={`road-${index}`}
          coordinates={road.path}
          strokeColor={floodLevelStyles[road.level].color}
          strokeWidth={6}
          lineCap="round"
          zIndex={3}
        />
      ))}
    </>
  );
}
