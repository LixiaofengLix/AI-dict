-- 迁移 1：建 docs/DEV_PLAN.md 第 7 节的表。
-- 插件（sqlx）按版本号递增执行，每个迁移只跑一次，所以这里不写 BEGIN / COMMIT。
-- 改表结构要新增文件（002_xxx.sql 并在 lib.rs 里注册），不要改已提交的迁移。

-- word 存原形，同一个词只收藏一次
CREATE TABLE vocabulary (
  id TEXT PRIMARY KEY NOT NULL,
  word TEXT NOT NULL COLLATE NOCASE UNIQUE,
  phonetic TEXT,
  brief_meaning TEXT NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

-- 同一个生词在不同句子里收藏，每次记一条语境
CREATE TABLE vocabulary_contexts (
  id TEXT PRIMARY KEY NOT NULL,
  vocabulary_id TEXT NOT NULL REFERENCES vocabulary (id) ON DELETE CASCADE,
  query TEXT NOT NULL,                  -- 点的原词（went），区别于原形（go）
  sentence TEXT NOT NULL,               -- 单词模式下收藏时为空字符串
  context_meaning TEXT,
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE ai_cache (
  key TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL
) STRICT;

-- value 为 JSON，包括 API Key
CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
) STRICT;
