import { AiError } from '../errors';

/**
 * 从模型输出里取出 JSON 对象：模型常常会包一层 ```json 代码块，或在前后加一两句说明，
 * 所以取第一个 "{" 到最后一个 "}" 之间的内容解析。
 */
export function extractJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new AiError('format', '返回内容里没有 JSON');
  }
  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new AiError('format', 'JSON 解析失败');
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new AiError('format', 'JSON 不是对象');
  }
  return json as Record<string, unknown>;
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** 数组里逐项校验，不合格的项丢掉，不让一条坏数据拖垮整个结果 */
export function list<T>(value: unknown, pick: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }
    const picked = pick(item as Record<string, unknown>);
    return picked === null ? [] : [picked];
  });
}
