import { fetch } from '@tauri-apps/plugin-http';

import type { AiConfig, ThinkingMode } from '../../types/ai';
import { abortError } from '../../utils/async';

import { AiError } from './errors';
import { createSseParser, errorMessageOf, parseStreamChunk } from './sse';

/** 多模态消息里的一段：文字，或一张图（OpenAI 的 image_url，值是 data URL） */
export type ContentPart =
  { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
};

export interface ChatOptions {
  signal?: AbortSignal;
  /** 每收到一段新内容时回调，参数为截至目前的完整文本 */
  onText?: (text: string) => void;
  temperature?: number;
  maxTokens?: number;
  /** 等首包、以及两块数据之间最多等多久 */
  timeoutMs?: number;
  /**
   * 传 false 时请求里不带思考参数（默认带，按配置里的思考模式）。
   * 大模型读图用：那条请求是另一个模型，思考参数是 DeepSeek 专用的，别的厂商可能不认；
   * 认字也不需要思考。
   */
  thinking?: boolean;
}

export const DEFAULT_TIMEOUT_MS = 30_000;

/** 用户填的 Base URL 可能带结尾斜杠，也可能已经是完整的 /chat/completions 地址 */
export function chatCompletionsUrl(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  return base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
}

/** 思考模式的请求参数，格式见 https://api-docs.deepseek.com/zh-cn/guides/thinking_mode */
export function thinkingParams(mode: ThinkingMode): Record<string, unknown> {
  if (mode === 'none') {
    return { thinking: { type: 'disabled' } };
  }
  return { thinking: { type: 'enabled' }, reasoning_effort: mode };
}

/** 服务返回的错误信息里可能带着 Key，显示和打印前抹掉 */
function scrub(message: string, apiKey: string): string {
  const text = apiKey ? message.split(apiKey).join('***') : message;
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}

function httpErrorMessage(body: string): string {
  try {
    const message = errorMessageOf(JSON.parse(body));
    if (message) {
      return message;
    }
  } catch {
    // 错误体不是 JSON，用原文
  }
  return body.trim();
}

/**
 * 请求兼容 OpenAI 协议的 /chat/completions（stream: true），返回完整文本。
 * 调用方取消时抛 AbortError；超时、网络、服务错误抛 AiError。
 */
export async function chatCompletion(
  config: AiConfig,
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const {
    signal,
    onText,
    temperature,
    maxTokens,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    thinking = true,
  } = options;
  if (signal?.aborted) {
    throw abortError();
  }

  // 被取消时 fetch 抛的错误分不清是超时还是调用方取消，自己记下取消原因
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const armTimeout = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  };
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  const toError = (error: unknown): Error => {
    if (signal?.aborted) {
      return abortError();
    }
    if (timedOut) {
      return new AiError('timeout', '请求超时');
    }
    if (error instanceof AiError) {
      return error;
    }
    return new AiError('network', error instanceof Error ? error.message : String(error));
  };

  armTimeout();
  try {
    const response = await fetch(chatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true,
        ...(thinking ? thinkingParams(config.thinking) : {}),
        ...(temperature === undefined ? {} : { temperature }),
        ...(maxTokens === undefined ? {} : { max_tokens: maxTokens }),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new AiError(
        'http',
        scrub(httpErrorMessage(body) || `HTTP ${response.status}`, config.apiKey),
        response.status,
      );
    }

    let full = '';
    let streamError: string | null = null;
    let finished = false;
    const parser = createSseParser((data) => {
      if (finished || streamError !== null) {
        return;
      }
      const chunk = parseStreamChunk(data);
      if (chunk.type === 'done') {
        finished = true;
      } else if (chunk.type === 'error') {
        streamError = chunk.message;
      } else if (chunk.text) {
        full += chunk.text;
        onText?.(full);
      }
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (!response.body || !contentType.includes('text/event-stream')) {
      // 有的服务忽略 stream 参数，直接返回整个 JSON
      const body = await response.text();
      let json: unknown = null;
      try {
        json = JSON.parse(body);
      } catch {
        parser.push(body);
        parser.end();
      }
      if (json !== null) {
        const message = errorMessageOf(json);
        if (message !== null) {
          streamError = message;
        } else {
          const content = (json as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]
            ?.message?.content;
          if (typeof content === 'string' && content) {
            full = content;
            onText?.(full);
          }
        }
      }
    } else {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (!finished && streamError === null) {
          const { done, value } = await reader.read();
          if (controller.signal.aborted) {
            throw abortError();
          }
          if (done) {
            break;
          }
          armTimeout();
          parser.push(decoder.decode(value, { stream: true }));
        }
        parser.push(decoder.decode());
        parser.end();
      } finally {
        if (finished || streamError !== null || controller.signal.aborted) {
          reader.cancel().catch(() => {});
        }
      }
    }

    if (streamError !== null) {
      throw new AiError('http', scrub(streamError || '服务返回错误', config.apiKey), 200);
    }
    if (!full) {
      throw new AiError('empty', '没有返回内容');
    }
    return full;
  } catch (error) {
    throw toError(error);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
