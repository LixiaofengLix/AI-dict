import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 迁移由 Rust 侧用 include_str! 注册（src-tauri/src/lib.rs），真正执行是插件的事。
 * 这里读同一批 SQL 文件，在内存 SQLite 上按文件名顺序跑一遍：
 * 验证 SQL 本身能用，建出来的表就是 docs/DEV_PLAN.md 第 7 节要的样子。
 */
const MIGRATIONS_DIR = fileURLToPath(new URL('../../../src-tauri/migrations', import.meta.url));
const LIB_RS = fileURLToPath(new URL('../../../src-tauri/src/lib.rs', import.meta.url));

const files = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort();

function applyMigrations(): DatabaseSync {
  // sqlx 建的连接默认开外键（外键约束才会生效），这里对齐
  const db = new DatabaseSync(':memory:', { enableForeignKeyConstraints: true });
  for (const name of files) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, name), 'utf8'));
  }
  return db;
}

function columns(db: DatabaseSync, table: string): string[] {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string; type: string }[];
  return rows.map((row) => `${row.name} ${row.type}`);
}

it('每个迁移文件都在 lib.rs 里注册了', () => {
  const libRs = readFileSync(LIB_RS, 'utf8');

  expect(files.length).toBeGreaterThan(0);
  for (const name of files) {
    expect(libRs).toContain(`migrations/${name}`);
  }
});

describe('第 7 节的表', () => {
  it('四张表都建出来了，且都是 STRICT', () => {
    const db = applyMigrations();

    const rows = db
      .prepare(
        "SELECT name, strict FROM pragma_table_list WHERE schema = 'main' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all()
      .map((row) => ({ ...row }));

    expect(rows).toEqual([
      { name: 'ai_cache', strict: 1 },
      { name: 'settings', strict: 1 },
      { name: 'vocabulary', strict: 1 },
      { name: 'vocabulary_contexts', strict: 1 },
    ]);
  });

  it('每张表的列和类型都对得上', () => {
    const db = applyMigrations();

    expect(columns(db, 'vocabulary')).toEqual([
      'id TEXT',
      'word TEXT',
      'phonetic TEXT',
      'brief_meaning TEXT',
      'created_at INTEGER',
    ]);
    expect(columns(db, 'vocabulary_contexts')).toEqual([
      'id TEXT',
      'vocabulary_id TEXT',
      'query TEXT',
      'sentence TEXT',
      'context_meaning TEXT',
      'created_at INTEGER',
    ]);
    expect(columns(db, 'ai_cache')).toEqual([
      'key TEXT',
      'kind TEXT',
      'response TEXT',
      'created_at INTEGER',
    ]);
    expect(columns(db, 'settings')).toEqual(['key TEXT', 'value TEXT']);
  });

  it('word 不区分大小写唯一', () => {
    const db = applyMigrations();
    const insert = db.prepare(
      'INSERT INTO vocabulary (id, word, brief_meaning, created_at) VALUES (?, ?, ?, ?)',
    );

    insert.run('1', 'Go', '去', 0);
    expect(() => insert.run('2', 'go', '去', 0)).toThrow(/UNIQUE/);
  });

  it('删掉生词时它的语境跟着删', () => {
    const db = applyMigrations();
    db.exec(`
      INSERT INTO vocabulary (id, word, brief_meaning, created_at) VALUES ('v1', 'go', '去', 0);
      INSERT INTO vocabulary_contexts (id, vocabulary_id, query, sentence, created_at)
        VALUES ('c1', 'v1', 'went', 'The alarm went off.', 0);
      DELETE FROM vocabulary WHERE id = 'v1';
    `);

    const { n } = db.prepare('SELECT count(*) AS n FROM vocabulary_contexts').get() as {
      n: number;
    };
    expect(n).toBe(0);
  });
});
