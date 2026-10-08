import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AiConfig } from '../../../types/ai';
import type { Accent } from '../../../types/settings';
import { createMemoryDb, type MemoryDb } from '../../__tests__/memoryDb';
import type { ChatOptions } from '../client';
import { AiError, describeAiError } from '../errors';
import { aiImpl } from '../impl';

/** chatCompletion、AI 配置和数据库都换掉：这里只测 impl 自己的逻辑 */
const mock = vi.hoisted(() => ({
  chat: vi.fn(),
  config: { apiKey: '', baseUrl: '', model: '', thinking: 'high' } as AiConfig,
  accent: 'us' as Accent,
  db: null as MemoryDb | null,
}));

vi.mock('../client', () => ({
  chatCompletion: (...args: unknown[]) => mock.chat(...args),
}));

vi.mock('../../settings', () => ({
  getAiConfig: async () => mock.config,
  getAccent: async () => mock.accent,
}));

vi.mock('../../db', () => ({
  getDb: async () => {
    if (!mock.db) {
      throw new Error('测试里还没准备内存数据库');
    }
    return mock.db;
  },
}));

const EMPTY: AiConfig = { apiKey: '', baseUrl: '', model: '', thinking: 'high' };

const CONFIG: AiConfig = {
  ...EMPTY,
  apiKey: 'sk-x',
  baseUrl: 'https://api.example.com/v1',
  model: 'm1',
};

beforeEach(() => {
  mock.chat.mockReset();
  mock.config = EMPTY;
  mock.accent = 'us';
  mock.db = createMemoryDb();
});

describe('aiImpl.isConfigured', () => {
  it('三项都填了才算已配置', async () => {
    expect(await aiImpl.isConfigured()).toBe(false);
    mock.config = { ...CONFIG, apiKey: '' };
    expect(await aiImpl.isConfigured()).toBe(false);
    mock.config = CONFIG;
    expect(await aiImpl.isConfigured()).toBe(true);
  });
});

describe('aiImpl.testConnection', () => {
  it('收到第一段内容就算成功，并取消剩下的输出', async () => {
    let signal: AbortSignal | undefined;
    mock.chat.mockImplementation(async (_config, _messages, options: ChatOptions) => {
      signal = options.signal;
      options.onText?.('O');
      const error = new Error('Aborted');
      error.name = 'AbortError';
      throw error;
    });
    expect(await aiImpl.testConnection(CONFIG)).toEqual({ ok: true });
    expect(signal?.aborted).toBe(true);
  });

  it('请求成功但没有正文（推理模型）也算成功', async () => {
    mock.chat.mockRejectedValue(new AiError('empty', '没有返回内容'));
    expect(await aiImpl.testConnection(CONFIG)).toEqual({ ok: true });
  });

  it('Key 无效时提示原因', async () => {
    mock.chat.mockRejectedValue(new AiError('http', 'Incorrect API key', 401));
    expect(await aiImpl.testConnection(CONFIG)).toEqual({
      ok: false,
      message: 'API Key 无效或没有权限',
    });
  });

  it('Base URL 格式不对时不发请求', async () => {
    expect(await aiImpl.testConnection({ ...CONFIG, baseUrl: 'api.example.com' })).toEqual({
      ok: false,
      message: 'Base URL 要以 http:// 或 https:// 开头',
    });
    expect(mock.chat).not.toHaveBeenCalled();
  });
});

describe('aiImpl.contextMeaning', () => {
  const input = { word: 'seedy', sentence: 'We were all feeling seedy.' };

  it('没配置时不发请求', async () => {
    await expect(aiImpl.contextMeaning(input)).rejects.toMatchObject({ kind: 'notConfigured' });
    expect(mock.chat).not.toHaveBeenCalled();
  });

  it('把单词和原句放进 prompt，流式回调并返回去掉首尾空白的结果', async () => {
    mock.config = CONFIG;
    mock.chat.mockImplementation(async (_config, _messages, options: ChatOptions) => {
      options.onText?.('\nseedy 在这里');
      return '\nseedy 在这里指"不舒服"。\n';
    });
    const seen: string[] = [];
    const text = await aiImpl.contextMeaning(input, { onText: (t) => seen.push(t) });
    expect(text).toBe('seedy 在这里指"不舒服"。');
    expect(seen).toEqual(['seedy 在这里']);
    const [config, messages] = mock.chat.mock.calls[0];
    expect(config).toEqual(CONFIG);
    const user = messages[messages.length - 1].content;
    expect(user).toContain('We were all feeling seedy.');
    expect(user).toContain('seedy 在这里指');
  });
});

describe('aiImpl.translate', () => {
  it('只翻译选中内容，上下文随 prompt 发出', async () => {
    mock.config = CONFIG;
    mock.chat.mockResolvedValue('我本身就是一家医院。\n');
    const text = await aiImpl.translate({
      text: 'I was a hospital in myself.',
      before: 'I had walked into that reading-room a happy, healthy man.',
      after: '',
    });
    expect(text).toBe('我本身就是一家医院。');
    const messages = mock.chat.mock.calls[0][1];
    const user = messages[messages.length - 1].content;
    expect(user).toContain('【上文】\nI had walked into that reading-room');
    expect(user).toContain('【选中的内容】\nI was a hospital in myself.');
    expect(user).not.toContain('【下文】');
  });
});

describe('翻译缓存', () => {
  const MINUTE = 60 * 1000;
  const input = { text: 'I was a hospital in myself.', before: '', after: '' };
  let now = 0;
  const cachedKinds = () =>
    mock
      .db!.raw.prepare("SELECT kind FROM ai_cache WHERE kind = 'translate'")
      .all()
      .map((row) => (row as { kind: string }).kind)
      .sort();

  beforeEach(() => {
    now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    mock.config = CONFIG;
  });
  afterEach(() => vi.restoreAllMocks());

  it('30 分钟内命中，命中不延长；过期后重新请求并删掉旧的', async () => {
    mock.chat.mockResolvedValueOnce('译文一').mockResolvedValueOnce('译文二');
    expect(await aiImpl.translate(input)).toBe('译文一');

    now += 29 * MINUTE;
    const onText = vi.fn();
    expect(await aiImpl.translate(input, { onText })).toBe('译文一');
    expect(onText).toHaveBeenCalledWith('译文一');
    expect(mock.chat).toHaveBeenCalledTimes(1);

    now += 1 * MINUTE;
    expect(await aiImpl.translate(input)).toBe('译文二');
    expect(mock.chat).toHaveBeenCalledTimes(2);
    expect(cachedKinds()).toEqual(['translate']);
  });

  it('重新生成覆盖缓存，从这次生成重新计时', async () => {
    mock.chat.mockResolvedValueOnce('译文一').mockResolvedValueOnce('译文二');
    await aiImpl.translate(input);
    now += 20 * MINUTE;
    expect(await aiImpl.translate(input, { refresh: true })).toBe('译文二');
    now += 20 * MINUTE;
    expect(await aiImpl.translate(input)).toBe('译文二');
    expect(mock.chat).toHaveBeenCalledTimes(2);
  });

  it('写入时清掉其他过期的', async () => {
    mock.chat.mockResolvedValueOnce('旧译文').mockResolvedValueOnce('新译文');
    await aiImpl.translate({ ...input, text: '旧的' });
    now += 31 * MINUTE;
    expect(await aiImpl.translate(input)).toBe('新译文');

    const keys = mock.db!.raw.prepare('SELECT key FROM ai_cache').all();
    expect(keys).toHaveLength(1);
  });

  it('失败不写缓存', async () => {
    mock.chat.mockRejectedValueOnce(new AiError('network', 'x')).mockResolvedValueOnce('译文');
    await expect(aiImpl.translate(input)).rejects.toThrow(AiError);
    expect(await aiImpl.translate(input)).toBe('译文');
    expect(mock.chat).toHaveBeenCalledTimes(2);
  });
});

describe('AI 结果缓存', () => {
  const dictJson = (word: string, meaning: string) =>
    JSON.stringify({ word, phonetic: 'ɡoʊ', tags: [], senses: [{ pos: 'v.', meaning }] });
  const clusterJson = JSON.stringify({
    forms: [
      { label: '原形', word: 'go' },
      { label: '过去式', word: 'went' },
      { label: '过去分词', word: 'gone' },
    ],
    family: [],
    confusables: [],
  });
  const went = { word: 'went', sentence: 'I went to my medical man.' };

  beforeEach(() => {
    mock.config = CONFIG;
  });

  it('语境释义按句子 + 单词缓存，命中时直接回调完整文本', async () => {
    mock.chat.mockResolvedValue('went 在这里指"去"。');
    await aiImpl.contextMeaning(went);
    const seen: string[] = [];
    expect(await aiImpl.contextMeaning(went, { onText: (t) => seen.push(t) })).toBe(
      'went 在这里指"去"。',
    );
    expect(seen).toEqual(['went 在这里指"去"。']);
    expect(mock.chat).toHaveBeenCalledTimes(1);

    await aiImpl.contextMeaning({ ...went, sentence: 'We went for a walk.' });
    expect(mock.chat).toHaveBeenCalledTimes(2);
  });

  it('AI 词典按原形缓存：查过 went 后再查 went 或 go 都不再请求', async () => {
    mock.chat.mockResolvedValue(dictJson('go', '去'));
    await aiImpl.aiDictionary(went);
    expect((await aiImpl.aiDictionary(went)).word).toBe('go');
    expect((await aiImpl.aiDictionary({ ...went, word: 'go', sentence: '' })).word).toBe('go');
    expect(mock.chat).toHaveBeenCalledTimes(1);
  });

  it('AI 词典的缓存区分口音', async () => {
    mock.chat.mockResolvedValue(dictJson('go', '去'));
    await aiImpl.aiDictionary(went);
    mock.accent = 'uk';
    await aiImpl.aiDictionary(went);
    expect(mock.chat).toHaveBeenCalledTimes(2);
  });

  it('单词簇里的变形都指向原形：查过 went 的单词簇后，gone 直接命中', async () => {
    mock.chat.mockResolvedValue(clusterJson);
    await aiImpl.wordCluster(went);
    const cluster = await aiImpl.wordCluster({ ...went, word: 'gone' });
    expect(cluster.forms[0]).toEqual({ label: '原形', word: 'go' });
    expect(mock.chat).toHaveBeenCalledTimes(1);
  });

  it('常见搭配用已知的原形缓存', async () => {
    mock.chat
      .mockResolvedValueOnce(dictJson('go', '去'))
      .mockResolvedValueOnce('{"collocations": [{"phrase": "go off", "meaning": "响"}]}');
    await aiImpl.aiDictionary(went);
    await aiImpl.collocations(went);
    const items = await aiImpl.collocations({ ...went, word: 'go' });
    expect(items[0].phrase).toBe('go off');
    expect(mock.chat).toHaveBeenCalledTimes(2);
  });

  it('重新生成时跳过缓存并覆盖', async () => {
    mock.chat
      .mockResolvedValueOnce(dictJson('go', '去'))
      .mockResolvedValueOnce(dictJson('go', '走；离开'));
    await aiImpl.aiDictionary(went);
    const refreshed = await aiImpl.aiDictionary(went, { refresh: true });
    expect(refreshed.senses[0].meaning).toBe('走；离开');
    expect((await aiImpl.aiDictionary(went)).senses[0].meaning).toBe('走；离开');
    expect(mock.chat).toHaveBeenCalledTimes(2);
  });

  it('请求失败时不写缓存', async () => {
    mock.chat.mockRejectedValueOnce(new AiError('network', 'x'));
    await expect(aiImpl.aiDictionary(went)).rejects.toMatchObject({ kind: 'network' });
    expect(mock.db!.raw.prepare('SELECT COUNT(*) AS n FROM ai_cache').get()?.n).toBe(0);
  });
});

describe('describeAiError', () => {
  it.each([
    [new AiError('network', 'x'), '网络连接失败，请检查网络'],
    [new AiError('timeout', 'x'), '请求超时，请稍后再试'],
    [new AiError('http', 'Unauthorized', 401), 'API Key 无效或没有权限'],
    [new AiError('http', 'Insufficient Balance', 402), '账户额度不足，请到 AI 服务商处充值'],
    [
      new AiError('http', 'You exceeded your current quota', 429),
      '账户额度不足，请到 AI 服务商处充值',
    ],
    [new AiError('http', 'Rate limit reached', 429), '请求太频繁，请稍后再试'],
    [new AiError('http', 'Not Found', 404), 'Base URL 或模型名不正确'],
    [new AiError('http', 'Bad Gateway', 502), 'AI 服务暂时不可用，请稍后再试'],
    [new AiError('http', 'Model Not Exist', 400), '请求被拒绝：Model Not Exist'],
    [new Error('boom'), '出了点问题，请稍后再试'],
  ])('%s', (error, expected) => {
    expect(describeAiError(error)).toBe(expected);
  });
});
