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
      execute: async (sql: string, params: unknown[]) => {
        if (sql.startsWith('DELETE')) {
          fake.rows.delete(params[0] as string);
        } else {
          fake.rows.set(params[0] as string, params[1] as string);
        }
        return { rowsAffected: 1 };
      },
    }),
  },
}));

// 默认快捷键按平台不同，测试里固定成 macOS，断言才稳定
vi.mock('../../utils/platform', () => ({ isMac: true }));

import {
  clearBaiduToken,
  getAccent,
  getAiConfig,
  getBaiduToken,
  getOcrConfig,
  getShortcuts,
  setAccent,
  setAiConfig,
  setBaiduToken,
  setOcrConfig,
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
    await expect(getShortcuts()).resolves.toEqual({
      selection: 'Alt+D',
      input: 'Alt+S',
      ocr: 'Alt+X',
    });
  });

  it('存进去能原样读回来，值按 JSON 存在 shortcuts 这行', async () => {
    await setShortcuts({ selection: 'Ctrl+Shift+1', input: 'Ctrl+Shift+2', ocr: 'Ctrl+Shift+3' });

    expect(JSON.parse(fake.rows.get('shortcuts') as string)).toEqual({
      selection: 'Ctrl+Shift+1',
      input: 'Ctrl+Shift+2',
      ocr: 'Ctrl+Shift+3',
    });
    await expect(getShortcuts()).resolves.toEqual({
      selection: 'Ctrl+Shift+1',
      input: 'Ctrl+Shift+2',
      ocr: 'Ctrl+Shift+3',
    });
  });

  it('字段缺失、空串或不是字符串的用默认值补齐', async () => {
    fake.rows.set('shortcuts', JSON.stringify({ selection: '  ', input: 42 }));
    await expect(getShortcuts()).resolves.toEqual({
      selection: 'Alt+D',
      input: 'Alt+S',
      ocr: 'Alt+X',
    });
  });
});

describe('截图识别设置', () => {
  it('没设置过时两层云识别都是关的，模型名和 Key 为空', async () => {
    await expect(getOcrConfig()).resolves.toEqual({
      vision: false,
      visionModel: '',
      baidu: false,
      baiduApiKey: '',
      baiduSecretKey: '',
    });
  });

  it('存进去能原样读回来，值按 JSON 存在 ocr 这行', async () => {
    const config = {
      vision: true,
      visionModel: 'qwen-vl-max',
      baidu: true,
      baiduApiKey: 'ak-1',
      baiduSecretKey: 'sk-1',
    };
    await setOcrConfig(config);

    expect(JSON.parse(fake.rows.get('ocr') as string)).toEqual(config);
    await expect(getOcrConfig()).resolves.toEqual(config);
  });

  it('存的内容缺字段或字段不合法时用默认值补齐，勾选项只认 true', async () => {
    fake.rows.set('ocr', JSON.stringify({ baidu: 'yes', baiduApiKey: 42, vision: 1 }));
    await expect(getOcrConfig()).resolves.toEqual({
      vision: false,
      visionModel: '',
      baidu: false,
      baiduApiKey: '',
      baiduSecretKey: '',
    });
  });
});

describe('百度 access_token 缓存', () => {
  const future = Date.now() + 24 * 60 * 60 * 1000;

  it('没存过时没有', async () => {
    await expect(getBaiduToken()).resolves.toBeNull();
  });

  it('没过期时原样读回来', async () => {
    await setBaiduToken({ token: 'tok-1', expiresAt: future });
    await expect(getBaiduToken()).resolves.toEqual({ token: 'tok-1', expiresAt: future });
  });

  it('过期的当作没有，并从表里删掉', async () => {
    await setBaiduToken({ token: 'tok-old', expiresAt: Date.now() - 1000 });

    await expect(getBaiduToken()).resolves.toBeNull();
    expect(fake.rows.has('baiduToken')).toBe(false);
  });

  it('存坏了的当作没有', async () => {
    fake.rows.set('baiduToken', JSON.stringify({ token: '', expiresAt: future }));
    await expect(getBaiduToken()).resolves.toBeNull();

    fake.rows.set('baiduToken', JSON.stringify({ token: 'tok-1' }));
    await expect(getBaiduToken()).resolves.toBeNull();
  });

  it('clear 之后就没有了', async () => {
    await setBaiduToken({ token: 'tok-1', expiresAt: future });
    await clearBaiduToken();
    await expect(getBaiduToken()).resolves.toBeNull();
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
