import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryDb, type MemoryDb } from './memoryDb';

// 用真的内存 SQLite（跑一遍迁移）：路由要和 settings 里的开关、token 缓存一起测
const memory = vi.hoisted(() => ({ db: null as MemoryDb | null }));
vi.mock('../db', () => ({ getDb: async () => memory.db }));

/** Rust 侧的系统 OCR，别用到的命令走不到 */
const invoke = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/api/core', () => ({ invoke }));

/** 百度的两个请求：换 access_token、识别 */
const httpFetch = vi.hoisted(() => vi.fn());
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: httpFetch }));

import { recognizeText } from '../ocr';
import { setOcrConfig } from '../settings';

const IMAGE = 'iVBORw0KGgo=';

/** 都用中英混排的两行，joinOcrLines 的结果就是中间加一个空格的整句 */
const SYSTEM_LINES = ['The alarm went', 'off.'];
const WORDS_BODY = { words_result: [{ words: 'The alarm went' }, { words: 'off.' }] };
const TOKEN_BODY = { access_token: 'tok-1', expires_in: 2592000 };
const JOINED = 'The alarm went off.';

const ok = (body: unknown) => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
const fail = (status: number) => ({ ok: false, status, text: async () => 'boom' });

/** 开通云 OCR，两个 Key 都填好 */
const enableBaidu = () =>
  setOcrConfig({ baidu: true, baiduApiKey: 'ak', baiduSecretKey: 'sk' });

beforeEach(() => {
  memory.db = createMemoryDb();
  invoke.mockReset();
  httpFetch.mockReset();
  invoke.mockResolvedValue(SYSTEM_LINES);
});

describe('截图识别的路由', () => {
  it('没勾云 OCR 时走系统 OCR', async () => {
    await expect(recognizeText(IMAGE)).resolves.toBe(JOINED);

    expect(invoke).toHaveBeenCalledWith('ocr_system', { image: IMAGE });
    expect(httpFetch).not.toHaveBeenCalled();
  });

  it('勾了但 Key 没填全时不算开通，还是走系统 OCR', async () => {
    await setOcrConfig({ baidu: true, baiduApiKey: 'ak', baiduSecretKey: '' });

    await expect(recognizeText(IMAGE)).resolves.toBe(JOINED);
    expect(httpFetch).not.toHaveBeenCalled();
  });

  it('勾了云 OCR 且两个 Key 都填了：先换 token 再识别，不问系统 OCR', async () => {
    await enableBaidu();
    httpFetch.mockResolvedValueOnce(ok(TOKEN_BODY)).mockResolvedValueOnce(ok(WORDS_BODY));

    await expect(recognizeText(IMAGE)).resolves.toBe(JOINED);

    expect(invoke).not.toHaveBeenCalled();
    const [tokenUrl, tokenInit] = httpFetch.mock.calls[0];
    expect(tokenUrl).toContain('aip.baidubce.com/oauth/2.0/token');
    expect(tokenUrl).toContain('client_id=ak');
    expect(tokenUrl).toContain('client_secret=sk');
    expect(tokenInit.method).toBe('POST');

    const [ocrUrl, ocrInit] = httpFetch.mock.calls[1];
    expect(ocrUrl).toContain('/rest/2.0/ocr/v1/accurate_basic');
    expect(ocrUrl).toContain('access_token=tok-1');
    expect(ocrInit.method).toBe('POST');
    expect(String(ocrInit.body)).toContain(`image=${encodeURIComponent(IMAGE)}`);
    expect(String(ocrInit.body)).toContain('language_type=CHN_ENG');
  });

  it('token 缓存在 settings 里：第二次识别不再换 token', async () => {
    await enableBaidu();
    httpFetch.mockResolvedValueOnce(ok(TOKEN_BODY)).mockResolvedValueOnce(ok(WORDS_BODY));
    await recognizeText(IMAGE);

    httpFetch.mockResolvedValue(ok(WORDS_BODY));
    await expect(recognizeText(IMAGE)).resolves.toBe(JOINED);

    expect(httpFetch).toHaveBeenCalledTimes(3);
    expect(httpFetch.mock.calls[2][0]).toContain('access_token=tok-1');
  });

  it('百度报业务错误（额度用尽）时降回系统 OCR', async () => {
    await enableBaidu();
    httpFetch
      .mockResolvedValueOnce(ok(TOKEN_BODY))
      .mockResolvedValueOnce(ok({ error_code: 17, error_msg: 'Open api daily request limit' }));

    await expect(recognizeText(IMAGE)).resolves.toBe(JOINED);
    expect(invoke).toHaveBeenCalledWith('ocr_system', { image: IMAGE });
  });

  it('百度请求失败（HTTP 500）时降回系统 OCR', async () => {
    await enableBaidu();
    httpFetch.mockResolvedValue(fail(500));

    await expect(recognizeText(IMAGE)).resolves.toBe(JOINED);
    expect(invoke).toHaveBeenCalledWith('ocr_system', { image: IMAGE });
  });

  it('缓存的 token 失效（110）时换一个重试，不降层', async () => {
    await enableBaidu();
    httpFetch
      .mockResolvedValueOnce(ok(TOKEN_BODY))
      .mockResolvedValueOnce(ok({ error_code: 110, error_msg: 'Access token invalid' }))
      .mockResolvedValueOnce(ok({ access_token: 'tok-2', expires_in: 2592000 }))
      .mockResolvedValueOnce(ok(WORDS_BODY));

    await expect(recognizeText(IMAGE)).resolves.toBe(JOINED);

    expect(httpFetch).toHaveBeenCalledTimes(4);
    expect(httpFetch.mock.calls[2][0]).toContain('oauth/2.0/token');
    expect(httpFetch.mock.calls[3][0]).toContain('access_token=tok-2');
    expect(invoke).not.toHaveBeenCalled();
  });
});
