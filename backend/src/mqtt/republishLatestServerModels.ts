import { listLatestServerModels } from '../repositories/models/listLatestServerModels.js';
import { publishNodeModel } from './publishNodeModel.js';

/**
 * MQTT VỪA NỐI (LẠI) → gửi lại công thức mới nhất máy chủ đã học cho từng trạm.
 * Phòng trường hợp: lúc học xong thì MQTT đang rớt, hoặc broker khởi động lại làm mất tin "retained".
 * Gửi lại nhiều lần không sao: trạm chỉ đổi công thức khi số phiên bản lớn hơn bản đang dùng.
 */
export async function republishLatestServerModels(): Promise<void> {
  const models = await listLatestServerModels();
  for (const model of models) await publishNodeModel(model);
}
