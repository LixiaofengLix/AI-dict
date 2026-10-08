import { getDb } from '../db';

/**
 * AI 结果缓存，存在 ai_cache 表。
 * 语境释义按"句子 + 单词"存；AI 词典、单词簇、常见搭配和句子无关，按单词原形存。
 * 请求前不知道原形，另存"查询词 → 原形"的映射（kind 为 lemma）：AI 词典返回的原形、单词簇里的全部变形都记下来。
 * 翻译按选中的内容存，从生成时起 30 分钟过期，命中不延长；过期的行读到或再写入翻译时删除。
 */
export type PassageKind = 'translate';
export type CacheKind =
  'contextMeaning' | 'aiDictionary' | 'wordCluster' | 'collocations' | PassageKind;

export const PASSAGE_TTL_MS = 30 * 60 * 1000;

const normalize = (word: string) => word.trim().toLowerCase();

export function contextMeaningKey(sentence: string, word: string) {
  return ['contextMeaning', sentence.trim(), normalize(word)].join('\n');
}

export function passageKey(kind: PassageKind, text: string) {
  return [kind, text.trim()].join('\n');
}

/** variant 区分同一个词的不同版本，例如 AI 词典的音标跟口音走 */
export function wordKey(
  kind: Exclude<CacheKind, 'contextMeaning' | PassageKind>,
  lemma: string,
  variant = '',
) {
  return [kind, variant, normalize(lemma)].join('\n');
}

const lemmaKey = (word: string) => ['lemma', normalize(word)].join('\n');

/** maxAgeMs：超过这个时长的缓存视为不存在并删掉 */
async function read<T>(key: string, maxAgeMs?: number): Promise<T | undefined> {
  try {
    const db = await getDb();
    const rows = await db.select<{ response: string; created_at: number }[]>(
      'SELECT response, created_at FROM ai_cache WHERE key = $1',
      [key],
    );
    const row = rows[0];
    if (!row) {
      return undefined;
    }
    if (maxAgeMs !== undefined && Date.now() - row.created_at >= maxAgeMs) {
      await db.execute('DELETE FROM ai_cache WHERE key = $1', [key]);
      return undefined;
    }
    return JSON.parse(row.response) as T;
  } catch (error) {
    console.warn('读取 AI 缓存失败', error);
    return undefined;
  }
}

async function write(entries: { key: string; kind: string; value: unknown }[]): Promise<void> {
  try {
    const db = await getDb();
    const now = Date.now();
    for (const { key, kind, value } of entries) {
      await db.execute(
        `INSERT INTO ai_cache (key, kind, response, created_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE SET
           kind = excluded.kind, response = excluded.response, created_at = excluded.created_at`,
        [key, kind, JSON.stringify(value), now],
      );
    }
  } catch (error) {
    console.warn('写入 AI 缓存失败', error);
  }
}

/** 删掉所有过期的翻译 */
async function purgeExpiredPassages(): Promise<void> {
  try {
    const db = await getDb();
    await db.execute('DELETE FROM ai_cache WHERE kind = $1 AND created_at <= $2', [
      'translate',
      Date.now() - PASSAGE_TTL_MS,
    ]);
  } catch (error) {
    console.warn('清理过期的 AI 缓存失败', error);
  }
}

export const aiCache = {
  get<T>(key: string) {
    return read<T>(key);
  },

  getPassage(kind: PassageKind, text: string) {
    return read<string>(passageKey(kind, text), PASSAGE_TTL_MS);
  },

  async setPassage(kind: PassageKind, text: string, value: string) {
    await purgeExpiredPassages();
    await write([{ key: passageKey(kind, text), kind, value }]);
  },

  set(key: string, kind: CacheKind, value: unknown) {
    return write([{ key, kind, value }]);
  },

  /** 查询词对应的原形；没记录时就是它自己 */
  async lemmaOf(word: string): Promise<string> {
    return (await read<string>(lemmaKey(word))) ?? normalize(word);
  },

  /** 记下这些词形都指向 lemma */
  rememberLemma(forms: string[], lemma: string) {
    const target = normalize(lemma);
    const unique = [...new Set(forms.map(normalize))].filter(Boolean);
    return write(unique.map((form) => ({ key: lemmaKey(form), kind: 'lemma', value: target })));
  },
};
