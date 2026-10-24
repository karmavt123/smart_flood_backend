import type { RequestHandler } from 'express';

import { NEARBY_DEFAULT_RADIUS_M, NEARBY_MAX_RADIUS_M } from '../../config/floodRules.js';
import { readQueryNumber } from '../../http/readQueryNumber.js';
import { buildNearbyResult } from '../../nearby/buildNearbyResult.js';

/** GET /api/v1/nearby?lat=10.77&lng=106.66&radius=2000 — tình hình ngập quanh 1 vị trí (màn "Quanh bạn"). */
export const getNearby: RequestHandler = async (request, response) => {
  const latitude = readQueryNumber(request.query.lat, 'lat', { min: -90, max: 90 });
  const longitude = readQueryNumber(request.query.lng, 'lng', { min: -180, max: 180 });
  const radiusM = readQueryNumber(request.query.radius, 'radius', {
    min: 100,
    max: NEARBY_MAX_RADIUS_M,
    fallback: NEARBY_DEFAULT_RADIUS_M,
  });
  response.json(await buildNearbyResult({ latitude, longitude }, radiusM));
};
