import type { AiConfig, AiDictEntry, AiTestResult, Collocation, WordCluster } from '../../types/ai';

export interface GenerateOptions {
  signal?: AbortSignal;
  /** 跳过缓存重新生成，并用新结果覆盖缓存 */
  refresh?: boolean;
}

export interface StreamOptions extends GenerateOptions {
  /** 每收到一段新内容时回调，参数为截至目前的完整文本 */
  onText?: (text: string) => void;
}

export interface WordContext {
  word: string;
  /** 单词所在的原句 */
  sentence: string;
}

export interface PassageContext {
  /** 用户选中的文字 */
  text: string;
  /** 选区前后的上下文，帮助 AI 理解 */
  before: string;
  after: string;
}

export interface AiService {
  /** 是否已填写 API Key、Base URL 和模型名 */
  isConfigured(): Promise<boolean>;
  testConnection(config: AiConfig): Promise<AiTestResult>;
  /** 语境释义：这个词在这句话里是什么意思（流式，命中缓存时直接返回） */
  contextMeaning(input: WordContext, options?: StreamOptions): Promise<string>;
  /** 以下三项和句子无关，按单词原形缓存；等 JSON 完整后一次返回 */
  aiDictionary(input: WordContext, options?: GenerateOptions): Promise<AiDictEntry>;
  wordCluster(input: WordContext, options?: GenerateOptions): Promise<WordCluster>;
  collocations(input: WordContext, options?: GenerateOptions): Promise<Collocation[]>;
  /**
   * 翻译（流式）：简单 Markdown，分 "## 中文翻译" 和 "## 句意解释" 两节。
   */
  translate(input: PassageContext, options?: StreamOptions): Promise<string>;
  /** 以上方法失败时，给用户看的中文原因 */
  describeError(error: unknown): string;
}
