import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({ loads: 0, failNext: false }));

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: async (url: string) => {
      fake.loads += 1;
      if (fake.failNext) {
        fake.failNext = false;
        throw new Error('打不开数据库');
      }
      return { url };
    },
  },
}));

beforeEach(() => {
  // db.ts 把连接缓存在模块作用域里，每个用例重新加载模块才能从头来过
  vi.resetModules();
  fake.loads = 0;
  fake.failNext = false;
});

describe('getDb', () => {
  it('多次调用只打开一次，拿到的是同一个连接', async () => {
    const { DB_URL, getDb } = await import('../db');

    const [first, second] = await Promise.all([getDb(), getDb()]);

    expect(first).toBe(second);
    expect(first).toMatchObject({ url: DB_URL });
    expect(fake.loads).toBe(1);
  });

  it('打开失败不缓存失败结果，下次调用会重试', async () => {
    fake.failNext = true;
    const { getDb } = await import('../db');

    await expect(getDb()).rejects.toThrow('打不开数据库');
    await expect(getDb()).resolves.toBeDefined();
    expect(fake.loads).toBe(2);
  });
});
