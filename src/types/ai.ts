/** 思考模式（DeepSeek 的参数）：none 关闭思考；low / high / max 打开思考并指定强度 */
export type ThinkingMode = 'none' | 'low' | 'high' | 'max';

/** 兼容 OpenAI 协议的 AI 服务配置 */
export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  thinking: ThinkingMode;
}

export type AiTestResult = { ok: true } | { ok: false; message: string };

export interface AiDictSense {
  pos: string;
  /** 中文释义 */
  meaning: string;
  /** 与中文释义一一对应的英文释义 */
  definition: string;
  example: string;
  exampleTranslation: string;
}

/** AI 词典 Tab 的内容（模型返回 JSON，校验后得到） */
export interface AiDictEntry {
  /** 单词原形：点 went 时为 go */
  word: string;
  phonetic: string | null;
  /** 考试范围等标签：四级、雅思… */
  tags: string[];
  senses: AiDictSense[];
}

/** 变形词：label 为"原形""过去式""复数"等 */
export interface WordForm {
  label: string;
  word: string;
}

/** 同根词 / 派生词 */
export interface RelatedWord {
  word: string;
  pos: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
}

/** 易混词 */
export interface ConfusableWord {
  word: string;
  meaning: string;
  /** 和本词的区别 */
  difference: string;
  example: string;
  exampleTranslation: string;
}

/** 单词簇 Tab 的内容；forms 第一项是原形，其余组没有内容时为空数组 */
export interface WordCluster {
  forms: WordForm[];
  family: RelatedWord[];
  confusables: ConfusableWord[];
}

/** 常见搭配 */
export interface Collocation {
  phrase: string;
  /** 原文里可能出现的写法（小写，含 phrase 本身），如 go off、went off；收藏后按这些标出 */
  forms: string[];
  meaning: string;
  example: string;
  exampleTranslation: string;
}
