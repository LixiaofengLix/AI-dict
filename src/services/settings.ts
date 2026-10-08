import type { AiConfig, ThinkingMode } from '../types/ai';
import { getDb } from './db';

/** settings 表按 key 存一行，value 是 JSON。AI 配置（含 API Key）都在这行里 */
const KEY_AI = 'ai';

const THINKING_MODES: readonly ThinkingMode[] = ['none', 'low', 'high', 'max'];

/** DeepSeek 不传参数时就是 high，和 ReadingBook 保持一致 */
const DEFAULT_THINKING: ThinkingMode = 'high';

function oneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return values.includes(value as T);
}

/** 存储里缺失或不合法的字段用默认值补上，表被手改过也不会让界面崩 */
function toAiConfig(stored: unknown): AiConfig {
  const s = (typeof stored === 'object' && stored !== null ? stored : {}) as Record<
    string,
    unknown
  >;
  return {
    apiKey: typeof s.apiKey === 'string' ? s.apiKey : '',
    baseUrl: typeof s.baseUrl === 'string' ? s.baseUrl : '',
    model: typeof s.model === 'string' ? s.model : '',
    thinking: oneOf(THINKING_MODES, s.thinking) ? s.thinking : DEFAULT_THINKING,
  };
}

/** 读一条设置。没存过或存的不是合法 JSON 都返回 undefined */
async function read(key: string): Promise<unknown> {
  const db = await getDb();
  // select 的泛型是整个结果（行数组），不是单行
  const rows = await db.select<{ value: string }[]>('SELECT value FROM settings WHERE key = $1', [
    key,
  ]);
  const row = rows[0];
  if (!row) {
    return undefined;
  }
  try {
    return JSON.parse(row.value);
  } catch {
    return undefined;
  }
}

/** 写一条设置，值序列化成 JSON */
async function write(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [key, JSON.stringify(value)],
  );
}

/** AI 配置。没配置过时各字段为空字符串，thinking 为默认值 */
export async function getAiConfig(): Promise<AiConfig> {
  return toAiConfig(await read(KEY_AI));
}

export async function setAiConfig(config: AiConfig): Promise<void> {
  await write(KEY_AI, config);
}
