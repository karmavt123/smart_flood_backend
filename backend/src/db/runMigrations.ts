import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { Database } from './Database.js';

/** Thư mục sql/ ở gốc project (đường dẫn đúng cả khi chạy từ src/ lẫn từ dist/). */
const SQL_DIR = fileURLToPath(new URL('../../sql/', import.meta.url));

/**
 * TẠO / CẬP NHẬT BẢNG khi khởi động: chạy lần lượt các file sql/001_..., 002_... chưa từng chạy.
 * Bảng `schema_migrations` ghi nhớ file nào đã chạy, nên mỗi file chỉ chạy đúng 1 lần.
 * Muốn đổi cấu trúc DB sau này: KHÔNG sửa file cũ, thêm file mới (vd 002_add_column.sql).
 */
export async function runMigrations(database: Database) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  const applied = await database.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  const appliedNames = new Set(applied.map((row) => row.filename));
  const files = readdirSync(SQL_DIR).filter((name) => name.endsWith('.sql')).sort();

  for (const file of files) {
    if (appliedNames.has(file)) continue;
    const sql = readFileSync(SQL_DIR + file, 'utf8');
    // Chạy trong 1 transaction: lỗi giữa chừng thì không để lại bảng làm dở.
    await database.exec(`BEGIN;\n${sql}\nINSERT INTO schema_migrations (filename) VALUES ('${file.replace(/'/g, "''")}');\nCOMMIT;`);
    console.log(`[db] Đã chạy ${file}`);
  }
}
