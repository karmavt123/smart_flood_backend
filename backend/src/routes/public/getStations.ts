import type { RequestHandler } from 'express';

import { loadStations } from '../../services/loadStations.js';

/** GET /api/v1/stations — danh sách trạm đang hoạt động kèm tình trạng mới nhất (app tải khi mở). */
export const getStations: RequestHandler = async (_request, response) => {
  response.json({ serverTime: new Date().toISOString(), stations: await loadStations() });
};
