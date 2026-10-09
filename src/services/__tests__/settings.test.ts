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

// 默认快捷键按平台不同，测试里固定成 macOS，断言才稳定
vi.mock('../../utils/platform', () => ({ isMac: true }));

import {
  getAccent,
  getAiConfig,
  getShortcuts,
  setAccent,
  setAiConfig,
  setShortcuts,
} from '../settings';

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

describe('快捷键设置', () => {
  it('没设置过时给默认值', async () => {
    await expect(getShortcuts()).resolves.toEqual({ selection: 'Alt+D', input: 'Alt+S' });
  });

  it('存进去能原样读回来，值按 JSON 存在 shortcuts 这行', async () => {
    await setShortcuts({ selection: 'Ctrl+Shift+1', input: 'Ctrl+Shift+2' });

    expect(JSON.parse(fake.rows.get('shortcuts') as string)).toEqual({
      selection: 'Ctrl+Shift+1',
      input: 'Ctrl+Shift+2',
    });
    await expect(getShortcuts()).resolves.toEqual({
      selection: 'Ctrl+Shift+1',
      input: 'Ctrl+Shift+2',
    });
  });

  it('字段缺失、空串或不是字符串的用默认值补齐', async () => {
    fake.rows.set('shortcuts', JSON.stringify({ selection: '  ', input: 42 }));
    await expect(getShortcuts()).resolves.toEqual({ selection: 'Alt+D', input: 'Alt+S' });
  });
});

describe('口音设置', () => {
  it('默认美音，能切到英音再切回来', async () => {
    await expect(getAccent()).resolves.toBe('us');

    await setAccent('uk');
    await expect(getAccent()).resolves.toBe('uk');

    await setAccent('us');
    await expect(getAccent()).resolves.toBe('us');
  });

  it('存了不认识的值就回退美音', async () => {
    fake.rows.set('accent', '"au"');
    await expect(getAccent()).resolves.toBe('us');
  });
});
