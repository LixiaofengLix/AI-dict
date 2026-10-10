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

/** 截图识别的配置（9.3、9.4）：云端的两层是可勾选项，系统 OCR 一直是兜底 */
export interface OcrConfig {
  /** 勾了才让大模型读图，而且要填视觉模型名、AI 配置也得齐全 */
  vision: boolean;
  /** 视觉模型名，Base URL 和 API Key 复用 AI 配置 */
  visionModel: string;
  /** 勾了才走百度高精度云 OCR，而且两个 Key 都得填 */
  baidu: boolean;
  baiduApiKey: string;
  baiduSecretKey: string;
}

/** 缓存的百度 access_token；百度给的是 30 天有效期，expiresAt 是毫秒时间戳 */
export interface BaiduToken {
  token: string;
  expiresAt: number;
}
