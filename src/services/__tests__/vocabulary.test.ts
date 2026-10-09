import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryDb, type MemoryDb } from './memoryDb';

// 用真的内存 SQLite（跑一遍迁移）：这里测的是 SQL 和去重逻辑，假表代替不了
const memory = vi.hoisted(() => ({ db: null as MemoryDb | null }));

vi.mock('../db', () => ({
  getDb: async () => memory.db,
}));

import { isStarred, star, unstar, type StarDetails } from '../vocabulary';

const SENTENCE_A = 'The alarm went off just as I was about to leave.';
const SENTENCE_B = 'The milk went off, so I poured it away.';

const details = (extra: Partial<StarDetails> = {}): StarDetails => ({
  word: 'go',
  phonetic: 'ɡəʊ',
  briefMeaning: 'v. 去；走',
  query: 'went',
  sentence: SENTENCE_A,
  contextMeaning: 'go off 在这里指闹钟响起。',
  ...extra,
});

const wordRows = () =>
  memory.db?.raw.prepare('SELECT word, phonetic, brief_meaning FROM vocabulary').all();

const contextRows = () =>
  memory.db?.raw.prepare('SELECT query, sentence, context_meaning FROM vocabulary_contexts').all();

beforeEach(() => {
  memory.db = createMemoryDb();
});

describe('vocabulary', () => {
  it('收藏后这句算收藏过，词和语境都写进各自的表', async () => {
    await star(details());

    await expect(isStarred('go', SENTENCE_A)).resolves.toBe(true);
    expect(wordRows()).toEqual([{ word: 'go', phonetic: 'ɡəʊ', brief_meaning: 'v. 去；走' }]);
    expect(contextRows()).toEqual([
      { query: 'went', sentence: SENTENCE_A, context_meaning: 'go off 在这里指闹钟响起。' },
    ]);
  });

  it('星标按「词 + 句子」判断：同一句话收过，别的句子还没收', async () => {
    await star(details());

    await expect(isStarred('go', SENTENCE_A)).resolves.toBe(true);
    await expect(isStarred('go', SENTENCE_B)).resolves.toBe(false);
    await expect(isStarred('run', SENTENCE_A)).resolves.toBe(false);
  });

  it('同一个词在新句子里收藏：词只建一条，追加第二条语境', async () => {
    await star(details());
    await star(details({ query: 'went', sentence: SENTENCE_B, contextMeaning: '变质。' }));

    expect(wordRows()).toHaveLength(1);
    expect(contextRows()).toEqual([
      { query: 'went', sentence: SENTENCE_A, context_meaning: 'go off 在这里指闹钟响起。' },
      { query: 'went', sentence: SENTENCE_B, context_meaning: '变质。' },
    ]);
  });

  it('同一个词同一句重复收藏不重复写', async () => {
    await star(details());
    await star(details({ contextMeaning: '另一种说法。' }));

    expect(contextRows()).toHaveLength(1);
  });

  it('大小写不敏感：存 Go 后按 go 查得到，也不新建词', async () => {
    await star(details({ word: 'Go' }));
    await expect(isStarred('go', SENTENCE_A)).resolves.toBe(true);

    await star(details({ word: 'go', sentence: SENTENCE_B }));
    expect(wordRows()).toHaveLength(1);
  });

  it('已有的词不覆盖先前的音标和释义', async () => {
    await star(details());
    await star(details({ sentence: SENTENCE_B, phonetic: '别的', briefMeaning: '别的释义' }));

    expect(wordRows()).toEqual([{ word: 'go', phonetic: 'ɡəʊ', brief_meaning: 'v. 去；走' }]);
  });

  it('取消只删这句的语境，别的语境和词都还在', async () => {
    await star(details());
    await star(details({ sentence: SENTENCE_B }));

    await unstar('go', SENTENCE_A);

    await expect(isStarred('go', SENTENCE_A)).resolves.toBe(false);
    await expect(isStarred('go', SENTENCE_B)).resolves.toBe(true);
    expect(wordRows()).toHaveLength(1);
  });

  it('取消最后一条语境时词一起删掉', async () => {
    await star(details());
    await unstar('go', SENTENCE_A);

    expect(wordRows()).toHaveLength(0);
    expect(contextRows()).toHaveLength(0);
  });

  it('取消没收藏过的词或句子不报错', async () => {
    await expect(unstar('go', SENTENCE_A)).resolves.toBeUndefined();

    await star(details());
    await expect(unstar('go', SENTENCE_B)).resolves.toBeUndefined();
    expect(contextRows()).toHaveLength(1);
  });

  it('语境释义还没流出来就收藏时存空', async () => {
    await star(details({ contextMeaning: null }));

    expect(contextRows()).toEqual([{ query: 'went', sentence: SENTENCE_A, context_meaning: null }]);
  });
});
