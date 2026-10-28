import type { Express } from 'express';

import { requireAdminKey } from '../http/requireAdminKey.js';
import { getAdminNodes } from './admin/getAdminNodes.js';
import { getIngestErrors } from './admin/getIngestErrors.js';
import { getTrainingRuns } from './admin/getTrainingRuns.js';
import { patchAdminNode } from './admin/patchAdminNode.js';
import { postAdminNode } from './admin/postAdminNode.js';
import { postImportReadings } from './admin/postImportReadings.js';
import { postRetrainNode } from './admin/postRetrainNode.js';
import { postTestMessage } from './admin/postTestMessage.js';

/** CÁC API ADMIN — phải gửi header x-admin-key đúng ADMIN_API_KEY. Trang /admin gọi các API này. */
export function registerAdminRoutes(app: Express, adminKey: string) {
  app.use('/api/v1/admin', requireAdminKey(adminKey));
  app.get('/api/v1/admin/nodes', getAdminNodes);
  app.post('/api/v1/admin/nodes', postAdminNode);
  app.patch('/api/v1/admin/nodes/:nodeId', patchAdminNode);
  app.post('/api/v1/admin/nodes/:nodeId/retrain', postRetrainNode);
  app.get('/api/v1/admin/nodes/:nodeId/training-runs', getTrainingRuns);
  app.get('/api/v1/admin/ingest-errors', getIngestErrors);
  app.post('/api/v1/admin/messages', postTestMessage);
  app.post('/api/v1/admin/import', postImportReadings);
}
