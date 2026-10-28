import type { Express } from 'express';

import { limitRequestsPerMinute } from '../http/limitRequestsPerMinute.js';
import { getHealth } from './public/getHealth.js';
import { getNearby } from './public/getNearby.js';
import { getStation } from './public/getStation.js';
import { getStationModels } from './public/getStationModels.js';
import { getStationReadings } from './public/getStationReadings.js';
import { getStations } from './public/getStations.js';
import { postRouteCheck } from './public/postRouteCheck.js';

/** CÁC API CÔNG KHAI cho app — chỉ đọc, không cần đăng nhập. */
export function registerPublicRoutes(app: Express) {
  app.get('/api/v1/health', getHealth);
  app.get('/api/v1/stations', getStations);
  app.get('/api/v1/stations/:nodeId', getStation);
  app.get('/api/v1/stations/:nodeId/readings', getStationReadings);
  app.get('/api/v1/stations/:nodeId/models', getStationModels);
  app.get('/api/v1/nearby', limitRequestsPerMinute(60), getNearby);
  app.post('/api/v1/route/check', limitRequestsPerMinute(20), postRouteCheck);
}
