import type { LatLng } from '../types/LatLng.js';

/** 1 tin nhắn của node SAU KHI đã kiểm tra hợp lệ và chuẩn hóa — sẵn sàng lưu vào DB. */
export interface ParsedNodeMessage {
  nodeId: string;
  measuredAt: Date;
  timeSource: 'device' | 'server';
  floodDepthCm: number;
  rainMm1h: number;
  tideCm: number;
  temperatureC: number | null;
  humidityPct: number | null;
  lightLux: number | null;
  batteryPct: number | null;
  rssiDbm: number | null;
  prediction: { depthCm: number; horizonMinutes: number } | null;
  model: {
    version: number;
    trainedAt: Date | null;
    samples: number | null;
    horizonMinutes: number | null;
    intercept: number;
    coefficients: Record<string, number>;
    maeCm: number | null;
    rmseCm: number | null;
    r2: number | null;
  } | null;
  location: LatLng | null;
  /** Các trường lạ node gửi thêm (lưu nguyên). */
  extra: Record<string, unknown>;
}
