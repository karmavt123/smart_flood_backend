import { demoStationSeeds } from './demoStations';

/**
 * Sinh LỊCH SỬ ĐO MẪU đúng định dạng GET /api/v1/stations/:nodeId/readings (phần "readings").
 * Giống gói tin trạm A01, A02 (không có độ ẩm, ánh sáng, pin, dự đoán). Có 1 cơn mưa làm nước dâng lên, và cố ý chừa 1 khoảng thiếu dữ liệu để thấy biểu đồ ngắt đường đúng cách.
 */
export function buildDemoHistory(nodeId: string, hours: number, now = Date.now()) {
  const seed = demoStationSeeds.find((s) => s.nodeId === nodeId);
  if (!seed || seed.depth === null || seed.secondsAgo === null) return [];

  const stepMin = hours <= 1 ? 2 : hours <= 24 ? 15 : 120;
  const count = Math.floor((hours * 60) / stepMin);
  const end = now - seed.secondsAgo * 1000;
  const gapStart = Math.floor(count * 0.6);
  const rows = [];

  for (let i = 0; i < count; i++) {
    if (i >= gapStart && i < gapStart + 3) continue; // khoảng thiếu dữ liệu
    const t = end - (count - 1 - i) * stepMin * 60 * 1000;
    const progress = i / Math.max(count - 1, 1);
    // Nước dâng dần về giá trị hiện tại, có dao động nhẹ; mưa tăng theo.
    const depth = Math.max(0, seed.depth * Math.pow(progress, 2) + Math.sin(i / 3) * 0.8);
    const rainRate = Math.max(0, seed.rainRate * progress + Math.sin(i / 4) * 3);
    rows.push({
      measuredAt: new Date(t).toISOString(),
      receivedAt: new Date(t).toISOString(),
      timeSource: 'device',
      floodDepthCm: Math.round(depth * 10) / 10,
      drainMm5min: Math.round(depth * 0.4 * 10) / 10,
      rainMm: Math.round((rainRate / 12) * 10) / 10,
      rainRateMmH: null,
      rainMm1h: null,
      tideCm: Math.round((130 + 25 * Math.sin(i / 10)) * 10) / 10,
      temperatureC: Math.round((28 + Math.sin(i / 8) * 1.5) * 10) / 10,
      humidityPct: null,
      lightLux: null,
      batteryPct: null,
      rssiDbm: null,
      predictedDepthCm: null,
      forecastMinutes: null,
      modelVersion: null,
      source: 'mqtt',
      extra: {},
    });
  }
  return rows;
}
