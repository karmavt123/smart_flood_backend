import { appConfig } from '../config/appConfig.js';
import { listNodesToRetrain } from '../repositories/training/listNodesToRetrain.js';
import { trainNodeModel } from './trainNodeModel.js';

/** HỌC LẠI CHO MỌI TRẠM có số đo trong N ngày gần nhất, lần lượt từng trạm, in kết quả ra log. */
export async function trainAllNodes(trigger: 'auto' | 'manual'): Promise<void> {
  const since = new Date(Date.now() - appConfig.modelTrainingDays * 86_400_000);
  const nodeIds = await listNodesToRetrain(since);
  console.log(`[train] Bắt đầu học lại cho ${nodeIds.length} trạm...`);
  for (const nodeId of nodeIds) {
    const outcome = await trainNodeModel(nodeId, trigger);
    if (outcome) console.log(`[train] ${nodeId}: ${outcome.run.reason}`);
  }
}
