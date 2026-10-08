/**
 * network：请求没发出去或中途断开；timeout：等首包或两块数据之间超时；
 * http：服务返回错误（status 为 HTTP 状态码，流里返回的错误为 200）；
 * empty：没有返回任何内容；format：返回的 JSON 不符合要求；notConfigured：还没填 AI 配置
 */
export type AiErrorKind = 'network' | 'timeout' | 'http' | 'empty' | 'format' | 'notConfigured';

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

const QUOTA_PATTERN = /quota|insufficient|balance|billing|余额|额度|欠费/i;

/** 给用户看的中文原因 */
export function describeAiError(error: unknown): string {
  if (!(error instanceof AiError)) {
    return '出了点问题，请稍后再试';
  }
  switch (error.kind) {
    case 'network':
      return '网络连接失败，请检查网络';
    case 'timeout':
      return '请求超时，请稍后再试';
    case 'empty':
      return 'AI 没有返回内容，请重试';
    case 'format':
      return 'AI 返回的内容格式不对，请重试';
    case 'notConfigured':
      return '还没有配置 AI 服务';
    case 'http':
      return describeHttpError(error.status, error.message);
  }
}

function describeHttpError(status: number | undefined, message: string): string {
  if (status === 401 || status === 403) {
    return 'API Key 无效或没有权限';
  }
  if (status === 402 || QUOTA_PATTERN.test(message)) {
    return '账户额度不足，请到 AI 服务商处充值';
  }
  if (status === 429) {
    return '请求太频繁，请稍后再试';
  }
  if (status === 404) {
    return 'Base URL 或模型名不正确';
  }
  if (status !== undefined && status >= 500) {
    return 'AI 服务暂时不可用，请稍后再试';
  }
  return message ? `请求被拒绝：${message}` : '请求被拒绝';
}
