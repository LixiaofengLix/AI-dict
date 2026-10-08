import Database from '@tauri-apps/plugin-sql';

/**
 * 数据库连接串。不写路径，插件会放到应用配置目录（macOS：~/Library/Application Support/com.aidict.app/）。
 * 要和 src-tauri/src/lib.rs 里 add_migrations 的连接串一致，否则迁移不会跑。
 */
export const DB_URL = 'sqlite:ai-dict.db';

let pending: Promise<Database> | null = null;

/**
 * 打开数据库。文件不存在时插件会自动建，并把 src-tauri/migrations/ 里注册的迁移跑一遍。
 * 两个窗口是两个 JS 上下文，各开一次；Rust 侧按连接串复用同一个连接池。
 */
export function getDb(): Promise<Database> {
  pending ??= Database.load(DB_URL).catch((error: unknown) => {
    // 失败的 promise 不留在缓存里，下次调用重新试一遍
    pending = null;
    throw error;
  });
  return pending;
}
