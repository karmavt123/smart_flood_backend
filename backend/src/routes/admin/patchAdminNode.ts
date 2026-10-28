import type { RequestHandler } from 'express';

import { HttpError } from '../../http/HttpError.js';
import { broadcastStationUpdate } from '../../realtime/realtimeHub.js';
import { updateNode } from '../../repositories/nodes/updateNode.js';
import { loadStations } from '../../services/loadStations.js';
import { nodeSettingsSchema } from './nodeSettingsSchema.js';

/** PATCH /api/v1/admin/nodes/:nodeId — sửa tên, vị trí, ngưỡng, chu kỳ gửi, ẩn/hiện node. */
export const patchAdminNode: RequestHandler = async (request, response) => {
  const nodeId = String(request.params.nodeId);
  const settings = nodeSettingsSchema.parse(request.body);
  if (!(await updateNode(nodeId, settings))) throw new HttpError(404, `Không có node "${nodeId}"`);
  const [node] = await loadStations({ includeInactive: true, nodeId });
  if (node) broadcastStationUpdate(node); // app đang mở thấy ngay vị trí/ngưỡng mới
  response.json({ node });
};
