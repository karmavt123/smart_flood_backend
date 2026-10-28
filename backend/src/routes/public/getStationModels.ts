import type { RequestHandler } from 'express';

import { HttpError } from '../../http/HttpError.js';
import { toModelDto } from '../../mappers/toModelDto.js';
import { listNodeModels } from '../../repositories/models/listNodeModels.js';
import { findNodeRecord } from '../../repositories/nodes/findNodeRecord.js';

/** GET /api/v1/stations/:nodeId/models — các phiên bản công thức của node (v1 = công thức chung → bản node tự học). */
export const getStationModels: RequestHandler = async (request, response) => {
  const nodeId = String(request.params.nodeId);
  if (!(await findNodeRecord(nodeId))) throw new HttpError(404, `Không có trạm "${nodeId}"`);
  const models = await listNodeModels(nodeId);
  response.json({ nodeId, models: models.map(toModelDto) });
};
