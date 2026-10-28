import type { RequestHandler } from 'express';

import { readQueryNumber } from '../../http/readQueryNumber.js';
import { toTrainingRunDto } from '../../mappers/toTrainingRunDto.js';
import { listTrainingRuns } from '../../repositories/training/listTrainingRuns.js';

/** GET /api/v1/admin/nodes/:nodeId/training-runs?limit=20 — nhật ký các lần máy chủ học lại công thức cho trạm. */
export const getTrainingRuns: RequestHandler = async (request, response) => {
  const nodeId = String(request.params.nodeId);
  const limit = Math.round(readQueryNumber(request.query.limit, 'limit', { min: 1, max: 200, fallback: 20 }));
  const runs = await listTrainingRuns(nodeId, limit);
  response.json({ nodeId, runs: runs.map(toTrainingRunDto) });
};
