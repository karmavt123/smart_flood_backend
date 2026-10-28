import type { RequestHandler } from 'express';

import { HttpError } from '../../http/HttpError.js';
import { createNode } from '../../repositories/nodes/createNode.js';
import { loadStations } from '../../services/loadStations.js';
import { createNodeSchema } from './nodeSettingsSchema.js';

/** POST /api/v1/admin/nodes — tạo node mới (khai báo trước tên, vị trí, ngưỡng). */
export const postAdminNode: RequestHandler = async (request, response) => {
  const { nodeId, ...settings } = createNodeSchema.parse(request.body);
  if (!(await createNode(nodeId, settings))) throw new HttpError(409, `Mã node "${nodeId}" đã có`);
  const [node] = await loadStations({ includeInactive: true, nodeId });
  response.status(201).json({ node });
};
