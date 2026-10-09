import type { AiConfig, ThinkingMode } from '../types/ai';
import type { Accent } from '../types/settings';
import { isMac } from '../utils/platform';
import { getDb } from './db';

/** settings 表按 key 存一行，value 是 JSON。AI 配置（含 API Key）都在这行里 */
const KEY_AI = 'ai';

/** 两个全局快捷键（7.1 起可改），值如 Alt+D */
const KEY_SHORTCUTS = 'shortcuts';

/** 发音口音 */
const KEY_ACCENT = 'accent';

/** 两个全局快捷键，和 utils 里的 PopupAction 一一对应 */
export type Shortcuts = { selection: string; input: string };

/**
 * 首次启动的默认快捷键。
 * macOS 用 Option 组合；Windows 上 Alt+字母会被菜单和地址栏吃掉，所以再加 Ctrl。
 */
export const DEFAULT_SHORTCUTS: Shortcuts = isMac
  ? { selection: 'Alt+D', input: 'Alt+S' }
  : { selection: 'Ctrl+Alt+D', input: 'Ctrl+Alt+S' };

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

/** 存储里缺失或写坏的字段逐个退回默认快捷键 */
function toShortcuts(stored: unknown): Shortcuts {
  const s = (typeof stored === 'object' && stored !== null ? stored : {}) as Record<
    string,
    unknown
  >;
  const pick = (value: unknown, fallback: string) =>
    typeof value === 'string' && value.trim() ? value.trim() : fallback;
  return {
    selection: pick(s.selection, DEFAULT_SHORTCUTS.selection),
    input: pick(s.input, DEFAULT_SHORTCUTS.input),
  };
}

/** 两个全局快捷键。没设置过时用默认值 */
export async function getShortcuts(): Promise<Shortcuts> {
  return toShortcuts(await read(KEY_SHORTCUTS));
}

export async function setShortcuts(shortcuts: Shortcuts): Promise<void> {
  await write(KEY_SHORTCUTS, shortcuts);
}

/**
 * 单词发音和音标的口音。
 * AI 词典按口音缓存音标（见 ai/cache.ts 的 wordKey），换口音后音标会重新请求。
 */
export async function getAccent(): Promise<Accent> {
  const stored = await read(KEY_ACCENT);
  return stored === 'uk' || stored === 'us' ? stored : 'us';
}

export async function setAccent(accent: Accent): Promise<void> {
  await write(KEY_ACCENT, accent);
}
