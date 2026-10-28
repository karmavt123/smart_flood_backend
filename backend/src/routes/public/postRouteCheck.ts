import type { RequestHandler } from 'express';
import { z } from 'zod';

import { checkRoute } from '../../routing/checkRoute.js';

const point = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
const bodySchema = z.object({ start: point, end: point });

/** POST /api/v1/route/check  body: { "start": {latitude, longitude}, "end": {latitude, longitude} } */
export const postRouteCheck: RequestHandler = async (request, response) => {
  const { start, end } = bodySchema.parse(request.body);
  response.json(await checkRoute(start, end));
};
