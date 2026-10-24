import type { RequestHandler } from 'express';

import { mqttStatus } from '../../mqtt/mqttStatus.js';
import { loadStations } from '../../services/loadStations.js';

/** GET /api/v1/admin/nodes — mọi node, kể cả node đã ẩn, kèm tình trạng MQTT (trang admin). */
export const getAdminNodes: RequestHandler = async (_request, response) => {
  response.json({
    serverTime: new Date().toISOString(),
    mqtt: mqttStatus,
    nodes: await loadStations({ includeInactive: true }),
  });
};
