import type { RequestHandler } from 'express';

import { HttpError } from '../../http/HttpError.js';
import { readQueryNumber } from '../../http/readQueryNumber.js';
import { toReadingDto } from '../../mappers/toReadingDto.js';
import { findNodeRecord } from '../../repositories/nodes/findNodeRecord.js';
import { listReadings } from '../../repositories/readings/listReadings.js';

/**
 * GET /api/v1/stations/:nodeId/readings?hours=24&limit=1000 — lịch sử đo để vẽ biểu đồ.
 *   hours: lấy bao nhiêu giờ gần nhất (1 – 2160, tức tối đa 90 ngày), mặc định 24
 *   limit: tối đa bao nhiêu lần đo (lấy các lần MỚI NHẤT), mặc định 1000, tối đa 5000
 */
export const getStationReadings: RequestHandler = async (request, response) => {
  const nodeId = String(request.params.nodeId);
  if (!(await findNodeRecord(nodeId))) throw new HttpError(404, `Không có trạm "${nodeId}"`);
  const hours = readQueryNumber(request.query.hours, 'hours', { min: 1, max: 2160, fallback: 24 });
  const limit = Math.round(readQueryNumber(request.query.limit, 'limit', { min: 1, max: 5000, fallback: 1000 }));
  const to = new Date();
  const from = new Date(to.getTime() - hours * 3600 * 1000);
  const readings = await listReadings(nodeId, from, to, limit);
  response.json({ nodeId, from: from.toISOString(), to: to.toISOString(), readings: readings.map(toReadingDto) });
};
