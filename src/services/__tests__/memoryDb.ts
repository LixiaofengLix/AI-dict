import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

/**
 * 测试用的内存数据库：跑一遍 src-tauri/migrations/ 里全部迁移，再包成 tauri-plugin-sql 的样子，
 * 这样测试里可以 `vi.mock('../../db', ...)` 把它塞给 service，不用改 service 的代码。
 */
const MIGRATIONS_DIR = fileURLToPath(new URL('../../../src-tauri/migrations', import.meta.url));

export interface MemoryDb {
  /** 直接跑 SQL 用，给测试做断言和造数据 */
  raw: DatabaseSync;
  /** 冒充 tauri-plugin-sql 的 Database.select */
  select<T>(sql: string, params?: unknown[]): Promise<T>;
  /** 冒充 tauri-plugin-sql 的 Database.execute */
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>;
}

/**
 * sqlx 用 $1…$n 顺序占位，node:sqlite 的位置绑定只认 ?，转一下。
 * service 里的 SQL 都是顺序占位，一一对应。
 */
const toPositional = (sql: string) => sql.replace(/\$\d+/g, '?');

export function createMemoryDb(): MemoryDb {
  const raw = new DatabaseSync(':memory:', { enableForeignKeyConstraints: true });
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const name of files) {
    raw.exec(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'));
  }

  return {
    raw,
    async select<T>(sql: string, params: unknown[] = []): Promise<T> {
      return raw.prepare(toPositional(sql)).all(...(params as SQLInputValue[])) as T;
    },
    async execute(sql: string, params: unknown[] = []) {
      const result = raw.prepare(toPositional(sql)).run(...(params as SQLInputValue[]));
      return { rowsAffected: Number(result.changes) };
    },
  };
}
