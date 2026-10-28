import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express from 'express';

import { appConfig } from '../config/appConfig.js';
import { registerAdminRoutes } from '../routes/registerAdminRoutes.js';
import { registerPublicRoutes } from '../routes/registerPublicRoutes.js';
import { handleHttpError } from './handleHttpError.js';
import { HttpError } from './HttpError.js';

/** Thư mục public/ ở gốc project (chứa trang admin). */
const PUBLIC_DIR = fileURLToPath(new URL('../../public/', import.meta.url));

/** TẠO ỨNG DỤNG WEB: bật CORS, đọc JSON, gắn API công khai + API admin + trang /admin. */
export function createHttpApp(adminKey: string) {
  const app = express();
  if (appConfig.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // CORS: cho phép app chạy trên trình duyệt (laptop) gọi thẳng API. Không dùng cookie nên an toàn.
  app.use(cors({ origin: appConfig.corsOrigin === '*' ? '*' : appConfig.corsOrigin.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '5mb' }));

  app.get('/', (_request, response) => {
    response.json({ name: 'SmartFlood backend', api: '/api/v1', admin: '/admin', health: '/api/v1/health' });
  });
  registerPublicRoutes(app);
  registerAdminRoutes(app, adminKey);
  app.use('/admin', express.static(`${PUBLIC_DIR}admin`));

  app.use((request, _response, next) => next(new HttpError(404, `Không có đường dẫn ${request.method} ${request.path}`)));
  app.use(handleHttpError);
  return app;
}
