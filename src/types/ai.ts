/** 思考模式（DeepSeek 的参数）：none 关闭思考；low / high / max 打开思考并指定强度 */
export type ThinkingMode = 'none' | 'low' | 'high' | 'max';

/** 兼容 OpenAI 协议的 AI 服务配置 */
export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  thinking: ThinkingMode;
}
