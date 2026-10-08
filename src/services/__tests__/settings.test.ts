import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiConfig } from '../../types/ai';

// 用一张内存里的假表替掉真的 SQLite：这里只测 settings 服务的读写和容错
const fake = vi.hoisted(() => ({ rows: new Map<string, string>() }));

vi.mock('@tauri-apps/plugin-sql', () => ({
  default: {
    load: async () => ({
      select: async (_sql: string, params: unknown[]) => {
        const value = fake.rows.get(params[0] as string);
        return value === undefined ? [] : [{ value }];
      },
      execute: async (_sql: string, params: unknown[]) => {
        fake.rows.set(params[0] as string, params[1] as string);
        return { rowsAffected: 1 };
      },
    }),
  },
}));

import { getAiConfig, setAiConfig } from '../settings';

/** 没配置过时的样子 */
const EMPTY: AiConfig = { apiKey: '', baseUrl: '', model: '', thinking: 'high' };

const CONFIG: AiConfig = {
  apiKey: 'sk-test-123',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  thinking: 'none',
};

beforeEach(() => {
  fake.rows.clear();
});

describe('AI 配置', () => {
  it('没配置过时给空配置和默认思考模式', async () => {
    await expect(getAiConfig()).resolves.toEqual(EMPTY);
  });

  it('存进去能原样读回来，值按 JSON 存在 ai 这行', async () => {
    await setAiConfig(CONFIG);

    expect(JSON.parse(fake.rows.get('ai') as string)).toEqual(CONFIG);
    await expect(getAiConfig()).resolves.toEqual(CONFIG);
  });

  it('存的内容缺字段或字段不合法时用默认值补齐', async () => {
    fake.rows.set(
      'ai',
      JSON.stringify({ baseUrl: 'https://api.deepseek.com/v1', model: 42, thinking: 'ultra' }),
    );

    await expect(getAiConfig()).resolves.toEqual({
      apiKey: '',
      baseUrl: 'https://api.deepseek.com/v1',
      model: '',
      thinking: 'high',
    });
  });

  it('存的内容不是合法 JSON 或不是对象时都当作没配置', async () => {
    fake.rows.set('ai', '不是 JSON');
    await expect(getAiConfig()).resolves.toEqual(EMPTY);

    fake.rows.set('ai', 'null');
    await expect(getAiConfig()).resolves.toEqual(EMPTY);
  });
});
