import type { RequestHandler } from 'express';

import { HttpError } from '../../http/HttpError.js';
import { loadStations } from '../../services/loadStations.js';

/** GET /api/v1/stations/:nodeId — 1 trạm. */
export const getStation: RequestHandler = async (request, response) => {
  const nodeId = String(request.params.nodeId);
  const [station] = await loadStations({ nodeId });
  if (!station) throw new HttpError(404, `Không có trạm "${nodeId}"`);
  response.json({ serverTime: new Date().toISOString(), station });
};
