/** 单词发音口音：美音 / 英音 */
export type Accent = 'us' | 'uk';

/** 可以在设置页改提示词的几种请求（见 services/ai/prompts/registry） */
export type PromptKind =
  | 'contextMeaning'
  | 'aiDictionary'
  | 'wordCluster'
  | 'collocations'
  | 'translateToChinese'
  | 'translateToEnglish';

/** 用户改过的提示词（只存可改的那部分）；没有的项用默认 */
export type PromptOverrides = Partial<Record<PromptKind, string>>;
