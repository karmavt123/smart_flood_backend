import { appConfig } from '../config/appConfig.js';
import { connectPostgres } from './connectPostgres.js';
import type { Database } from './Database.js';
import { openEmbeddedDatabase } from './openEmbeddedDatabase.js';

/** Chọn loại DB: có DATABASE_URL → PostgreSQL thật; để trống → PostgreSQL nhúng để chạy thử. */
export async function createDatabase(): Promise<Database> {
  if (appConfig.databaseUrl) return connectPostgres(appConfig.databaseUrl);
  if (appConfig.isProduction) {
    throw new Error('Máy chủ thật (NODE_ENV=production) phải đặt DATABASE_URL, không dùng DB nhúng.');
  }
  return openEmbeddedDatabase(appConfig.embeddedDbDir);
}
