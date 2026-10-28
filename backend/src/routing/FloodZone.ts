import type { StationDto } from '../types/StationDto.js';

/** 1 vùng cần tránh khi đi đường: tâm là node đang ngập, bán kính = vùng ảnh hưởng + vùng đệm. */
export interface FloodZone {
  station: StationDto;
  radiusM: number;
}
