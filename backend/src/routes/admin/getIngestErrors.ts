import type { RequestHandler } from 'express';

import { toIsoString } from '../../geo/toIsoString.js';
import { readQueryNumber } from '../../http/readQueryNumber.js';
import { listIngestErrors } from '../../repositories/errors/listIngestErrors.js';

/** GET /api/v1/admin/ingest-errors?limit=100 — các tin nhắn bị từ chối gần nhất và lý do. */
export const getIngestErrors: RequestHandler = async (request, response) => {
  const limit = Math.round(readQueryNumber(request.query.limit, 'limit', { min: 1, max: 500, fallback: 100 }));
  const rows = await listIngestErrors(limit);
  response.json({
    errors: rows.map((row) => ({
      id: row.id,
      receivedAt: toIsoString(row.received_at),
      channel: row.channel,
      topic: row.topic,
      payload: row.payload,
      reason: row.reason,
    })),
  });
};
