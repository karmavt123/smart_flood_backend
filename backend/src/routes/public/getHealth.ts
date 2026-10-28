import type { RequestHandler } from 'express';

import { db } from '../../db/sharedDatabase.js';
import { eraStatus } from '../../era/eraStatus.js';
import { mqttStatus } from '../../mqtt/mqttStatus.js';

/** GET /api/v1/health — máy chủ còn sống không, DB và MQTT có kết nối không. Dùng để kiểm tra nhanh sau khi deploy. */
export const getHealth: RequestHandler = async (_request, response) => {
  let dbOk = true;
  try {
    await db().query('SELECT 1');
  } catch {
    dbOk = false;
  }
  response.status(dbOk ? 200 : 503).json({
    ok: dbOk && mqttStatus.connected,
    serverTime: new Date().toISOString(),
    database: { ok: dbOk, kind: db().kind },
    mqtt: {
      connected: mqttStatus.connected,
      messagesReceived: mqttStatus.messagesReceived,
      lastMessageAt: mqttStatus.lastMessageAt,
    },
    // Chỉ có khi bật cầu nối E-Ra. Không tính vào "ok": E-Ra trục trặc không có nghĩa máy chủ mình hỏng.
    ...(eraStatus.enabled
      ? {
          era: {
            connected: eraStatus.connected,
            nodeId: eraStatus.nodeId,
            messagesReceived: eraStatus.messagesReceived,
            readingsSaved: eraStatus.readingsSaved,
            lastMessageAt: eraStatus.lastMessageAt,
            lastReadingAt: eraStatus.lastReadingAt,
            lastError: eraStatus.lastError,
          },
        }
      : {}),
  });
};
