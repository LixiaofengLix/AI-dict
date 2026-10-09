import { getDb } from './db';

/** 收藏一个语境时要写的内容；原形、音标、简要释义都来自 AI 词典 */
export type StarDetails = {
  /** 原形（go），vocabulary 里一个词只存一条 */
  word: string;
  phonetic: string | null;
  /** 生词本列表用的简要释义（briefMeaning() 生成） */
  briefMeaning: string;
  /** 点的那个词（went），区别于原形 */
  query: string;
  /** 所在句子；单词模式下为空字符串 */
  sentence: string;
  /** 收藏那一刻的语境释义；还在流式或失败时可能只有一部分甚至为空 */
  contextMeaning: string | null;
};

const createId = () => crypto.randomUUID();

/** 生词本列表里的一行 */
export type VocabularyListItem = {
  id: string;
  word: string;
  phonetic: string | null;
  briefMeaning: string;
  createdAt: number;
  /** 语境条数（单词模式下收藏的词是一条没有句子的语境） */
  contextCount: number;
};

/** 生词详情里的一条语境 */
export type VocabularyContext = {
  id: string;
  /** 收藏时点的原词（went），句子高亮用它 */
  query: string;
  sentence: string;
  contextMeaning: string | null;
  createdAt: number;
};

export type VocabularyDetail = {
  id: string;
  word: string;
  phonetic: string | null;
  briefMeaning: string;
  createdAt: number;
  /** 收藏过的全部语境，新的在前 */
  contexts: VocabularyContext[];
};

/** 生词本列表，按收藏时间倒序 */
export async function listWords(): Promise<VocabularyListItem[]> {
  const db = await getDb();
  const rows = await db.select<
    {
      id: string;
      word: string;
      phonetic: string | null;
      brief_meaning: string;
      created_at: number;
      context_count: number;
    }[]
  >(
    `SELECT v.id, v.word, v.phonetic, v.brief_meaning, v.created_at,
            (SELECT count(*) FROM vocabulary_contexts c WHERE c.vocabulary_id = v.id) AS context_count
       FROM vocabulary v
      ORDER BY v.created_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    word: row.word,
    phonetic: row.phonetic,
    briefMeaning: row.brief_meaning,
    createdAt: row.created_at,
    contextCount: row.context_count,
  }));
}

/** 生词详情：词条 + 全部语境；词已经删掉时返回 null */
export async function getWordDetail(id: string): Promise<VocabularyDetail | null> {
  const db = await getDb();
  const words = await db.select<
    {
      id: string;
      word: string;
      phonetic: string | null;
      brief_meaning: string;
      created_at: number;
    }[]
  >('SELECT id, word, phonetic, brief_meaning, created_at FROM vocabulary WHERE id = $1', [id]);
  const word = words[0];
  if (!word) {
    return null;
  }

  const contexts = await db.select<
    {
      id: string;
      query: string;
      sentence: string;
      context_meaning: string | null;
      created_at: number;
    }[]
  >(
    `SELECT id, query, sentence, context_meaning, created_at FROM vocabulary_contexts
      WHERE vocabulary_id = $1 ORDER BY created_at DESC`,
    [id],
  );
  return {
    id: word.id,
    word: word.word,
    phonetic: word.phonetic,
    briefMeaning: word.brief_meaning,
    createdAt: word.created_at,
    contexts: contexts.map((row) => ({
      id: row.id,
      query: row.query,
      sentence: row.sentence,
      contextMeaning: row.context_meaning,
      createdAt: row.created_at,
    })),
  };
}

/** 删除一个生词（生词本里的删除），它的语境一起删 */
export async function removeWord(id: string): Promise<void> {
  const db = await getDb();
  // 显式删语境，不依赖外键级联：sqlx 建连接时开了外键，但这里不赌插件的默认值
  await db.execute('DELETE FROM vocabulary_contexts WHERE vocabulary_id = $1', [id]);
  await db.execute('DELETE FROM vocabulary WHERE id = $1', [id]);
}

/**
 * 这个词在这句话里的语境收过没有（按原形查，word 列是 NOCASE）。
 * 星标就按它显示（6.1 定）：同一个词在新句子里是未收藏，可以再收一条语境。
 */
export async function isStarred(word: string, sentence: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    `SELECT c.id FROM vocabulary_contexts c
       JOIN vocabulary v ON v.id = c.vocabulary_id
      WHERE v.word = $1 AND c.sentence = $2`,
    [word.trim(), sentence],
  );
  return rows.length > 0;
}

/**
 * 收藏：词不存在就建，已存在就在它下面追加一条语境。
 * 同一句重复收藏不重复写（界面上实心星点击是取消，这里只是兜底）。
 */
export async function star(details: StarDetails): Promise<void> {
  const db = await getDb();
  const word = details.word.trim();
  // 已有的词不更新音标和释义：同一个词的词典结果按缓存一致，保持第一次的就好
  const words = await db.select<{ id: string }[]>('SELECT id FROM vocabulary WHERE word = $1', [
    word,
  ]);
  let vocabularyId = words[0]?.id;
  if (!vocabularyId) {
    vocabularyId = createId();
    await db.execute(
      'INSERT INTO vocabulary (id, word, phonetic, brief_meaning, created_at) VALUES ($1, $2, $3, $4, $5)',
      [vocabularyId, word, details.phonetic, details.briefMeaning, Date.now()],
    );
  }

  const contexts = await db.select<{ id: string }[]>(
    'SELECT id FROM vocabulary_contexts WHERE vocabulary_id = $1 AND sentence = $2',
    [vocabularyId, details.sentence],
  );
  if (contexts.length > 0) {
    return;
  }
  await db.execute(
    `INSERT INTO vocabulary_contexts (id, vocabulary_id, query, sentence, context_meaning, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [createId(), vocabularyId, details.query, details.sentence, details.contextMeaning, Date.now()],
  );
}

/**
 * 取消这句话里的收藏：删掉这条语境，这个词再无别的语境时连词删掉。
 * 没收藏过的词（或这句话）什么也不做。
 */
export async function unstar(word: string, sentence: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<{ vocabularyId: string; contextId: string }[]>(
    `SELECT v.id AS vocabularyId, c.id AS contextId FROM vocabulary_contexts c
       JOIN vocabulary v ON v.id = c.vocabulary_id
      WHERE v.word = $1 AND c.sentence = $2`,
    [word.trim(), sentence],
  );
  const found = rows[0];
  if (!found) {
    return;
  }

  await db.execute('DELETE FROM vocabulary_contexts WHERE id = $1', [found.contextId]);
  const rest = await db.select<{ n: number }[]>(
    'SELECT count(*) AS n FROM vocabulary_contexts WHERE vocabulary_id = $1',
    [found.vocabularyId],
  );
  if ((rest[0]?.n ?? 0) === 0) {
    await db.execute('DELETE FROM vocabulary WHERE id = $1', [found.vocabularyId]);
  }
}
