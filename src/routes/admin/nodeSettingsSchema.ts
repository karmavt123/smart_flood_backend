import { z } from 'zod';

/** Khuôn thông tin admin được sửa cho 1 node (mọi trường đều không bắt buộc). */
export const nodeSettingsSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    address: z.string().trim().max(200),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    warningCm: z.number().positive().max(500),
    dangerCm: z.number().positive().max(500),
    criticalCm: z.number().positive().max(500),
    expectedIntervalSec: z.number().int().min(10).max(86400),
    isActive: z.boolean(),
  })
  .partial()
  .strict();

/** Khuôn khi tạo node mới: bắt buộc có mã node. */
export const createNodeSchema = nodeSettingsSchema.extend({
  nodeId: z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/, 'chỉ gồm chữ không dấu, số, gạch ngang, gạch dưới, chấm'),
});
