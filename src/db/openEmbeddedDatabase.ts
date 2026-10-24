import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Database } from './Database.js';

/**
 * Mở PostgreSQL NHÚNG (PGlite) — chạy ngay trong backend, KHÔNG cần cài PostgreSQL.
 * Dữ liệu lưu trong thư mục `dataDir` (mặc định ./data/pglite). Xóa thư mục đó = xóa sạch dữ liệu thử.
 * Chỉ dùng để chạy thử trên laptop: chỉ 1 chương trình được mở thư mục này cùng lúc.
 */
export async function openEmbeddedDatabase(dataDir: string): Promise<Database> {
  const fullPath = resolve(dataDir);
  mkdirSync(fullPath, { recursive: true });
  // Chỉ nạp thư viện PGlite khi cần, nên máy chủ thật (dùng PostgreSQL) không phải tải nó.
  const { PGlite } = await import('@electric-sql/pglite');
  const pglite = await PGlite.create(fullPath);

  return {
    kind: 'pglite',
    async query<Row>(sql: string, params: unknown[] = []) {
      const result = await pglite.query<Row>(sql, params);
      return result.rows;
    },
    async exec(sql: string) {
      await pglite.exec(sql);
    },
    async close() {
      await pglite.close();
    },
  };
}
