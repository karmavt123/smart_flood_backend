import type { RequestHandler } from 'express';

import { HttpError } from '../../http/HttpError.js';
import { toModelDto } from '../../mappers/toModelDto.js';
import { toTrainingRunDto } from '../../mappers/toTrainingRunDto.js';
import { broadcastStationUpdate } from '../../realtime/realtimeHub.js';
import { findNodeRecord } from '../../repositories/nodes/findNodeRecord.js';
import { loadStations } from '../../services/loadStations.js';
import { trainNodeModel } from '../../training/trainNodeModel.js';

/**
 * POST /api/v1/admin/nodes/:nodeId/retrain — nút "Học lại ngay" ở trang admin:
 * máy chủ học lại công thức cho trạm NGAY LÚC BẤM (bình thường tự học mỗi ngày 1 lần).
 */
export const postRetrainNode: RequestHandler = async (request, response) => {
  const nodeId = String(request.params.nodeId);
  if (!(await findNodeRecord(nodeId))) throw new HttpError(404, `Không có node "${nodeId}"`);
  const outcome = await trainNodeModel(nodeId, 'manual');
  if (!outcome) throw new HttpError(409, 'Trạm này đang được học lại, đợi vài giây rồi bấm lại.');
  if (outcome.model) {
    const [station] = await loadStations({ includeInactive: true, nodeId });
    if (station?.isActive) broadcastStationUpdate(station); // app đang mở thấy ngay phiên bản mới
  }
  response.json({ run: toTrainingRunDto(outcome.run), model: outcome.model ? toModelDto(outcome.model) : null });
};
