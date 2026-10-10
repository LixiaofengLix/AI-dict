import { TextEncoder } from 'node:util';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiConfig } from '../../../types/ai';
import { isAbortError } from '../../../utils/async';

import { chatCompletion, chatCompletionsUrl } from '../client';
import { AiError } from '../errors';

const mockFetch = vi.fn();
vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));

const CONFIG: AiConfig = {
  apiKey: 'sk-secret-123',
  baseUrl: 'https://api.example.com/v1/',
  model: 'm1',
  thinking: 'high',
};
const MESSAGES = [{ role: 'user' as const, content: 'hi' }];

type Step = string | Uint8Array | { wait: number } | { fail: Error };

/** 按步骤吐出数据的假响应体；取消时 read() 抛错，和插件的 fetch 一致 */
function streamBody(steps: Step[], signal?: AbortSignal) {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    getReader: () => ({
      async read(): Promise<{ done: boolean; value?: Uint8Array }> {
        while (i < steps.length) {
          const step = steps[i++];
          if (typeof step === 'string') {
            return { done: false, value: encoder.encode(step) };
          }
          if (step instanceof Uint8Array) {
            return { done: false, value: step };
          }
          if ('fail' in step) {
            throw step.fail;
          }
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, step.wait);
            signal?.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new Error('The operation was aborted.'));
            });
          });
        }
        return { done: true };
      },
      cancel: vi.fn(async () => {}),
    }),
  };
}

function sseResponse(steps: Step[]) {
  return (_url: string, init: { signal: AbortSignal }) =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => 'text/event-stream; charset=utf-8' },
      body: streamBody(steps, init.signal),
      text: async () => '',
    });
}

function jsonResponse(status: number, body: string, contentType = 'application/json') {
  return () =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => contentType },
      body: null,
      text: async () => body,
    });
}

const delta = (text: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('chatCompletionsUrl', () => {
  it('拼上 /chat/completions，去掉结尾斜杠', () => {
    expect(chatCompletionsUrl('https://api.openai.com/v1/')).toBe(
      'https://api.openai.com/v1/chat/completions',
    );
    expect(chatCompletionsUrl(' https://x.com/v1/chat/completions ')).toBe(
      'https://x.com/v1/chat/completions',
    );
  });
});

describe('chatCompletion', () => {
  it('发出流式请求并逐块回调完整文本', async () => {
    mockFetch.mockImplementation(sseResponse([delta('Hel'), delta('lo'), 'data: [DONE]\n\n']));
    const seen: string[] = [];
    const text = await chatCompletion(CONFIG, MESSAGES, {
      onText: (t) => seen.push(t),
      temperature: 0.3,
    });
    expect(text).toBe('Hello');
    expect(seen).toEqual(['Hel', 'Hello']);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-secret-123');
    expect(JSON.parse(init.body)).toEqual({
      model: 'm1',
      messages: MESSAGES,
      stream: true,
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
      temperature: 0.3,
    });
  });

  it('思考模式：None 关闭思考，各档强度按 DeepSeek 的格式发送', async () => {
    const bodyFor = async (thinking: AiConfig['thinking']) => {
      mockFetch.mockReset();
      mockFetch.mockImplementation(sseResponse([delta('ok'), 'data: [DONE]\n\n']));
      await chatCompletion({ ...CONFIG, thinking }, MESSAGES);
      return JSON.parse(mockFetch.mock.calls[0][1].body);
    };
    const none = await bodyFor('none');
    expect(none).toMatchObject({ thinking: { type: 'disabled' } });
    expect(none).not.toHaveProperty('reasoning_effort');
    expect(await bodyFor('max')).toMatchObject({
      thinking: { type: 'enabled' },
      reasoning_effort: 'max',
    });
  });

  it('多模态消息原样进 body；thinking 传 false 时不带思考参数', async () => {
    mockFetch.mockImplementation(sseResponse([delta('The alarm went'), 'data: [DONE]\n\n']));
    const parts = [
      { type: 'text' as const, text: '把这张图里的文字原样输出。' },
      { type: 'image_url' as const, image_url: { url: 'data:image/png;base64,xx' } },
    ];

    const text = await chatCompletion(CONFIG, [{ role: 'user', content: parts }], {
      thinking: false,
      temperature: 0,
    });

    expect(text).toBe('The alarm went');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages).toEqual([{ role: 'user', content: parts }]);
    expect(body).not.toHaveProperty('thinking');
    expect(body).not.toHaveProperty('reasoning_effort');
  });

  it('中文被切在字节中间也不乱码', async () => {
    const bytes = new TextEncoder().encode(delta('语境释义'));
    const cut = bytes.indexOf(0xe8) + 1;
    mockFetch.mockImplementation(sseResponse([bytes.slice(0, cut), bytes.slice(cut)]));
    expect(await chatCompletion(CONFIG, MESSAGES)).toBe('语境释义');
  });

  it('服务忽略 stream 参数直接返回 JSON 时也能取到内容', async () => {
    mockFetch.mockImplementation(
      jsonResponse(200, JSON.stringify({ choices: [{ message: { content: '整段' } }] })),
    );
    expect(await chatCompletion(CONFIG, MESSAGES)).toBe('整段');
  });

  it('HTTP 错误带状态码和服务返回的信息，信息里的 Key 被抹掉', async () => {
    mockFetch.mockImplementation(
      jsonResponse(
        401,
        JSON.stringify({ error: { message: 'Incorrect API key provided: sk-secret-123' } }),
      ),
    );
    const error = await chatCompletion(CONFIG, MESSAGES).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiError);
    expect(error).toMatchObject({ kind: 'http', status: 401 });
    expect((error as Error).message).toBe('Incorrect API key provided: ***');
  });

  it('错误体不是 JSON 时用原文', async () => {
    mockFetch.mockImplementation(jsonResponse(502, 'Bad Gateway', 'text/plain'));
    await expect(chatCompletion(CONFIG, MESSAGES)).rejects.toMatchObject({
      kind: 'http',
      status: 502,
      message: 'Bad Gateway',
    });
  });

  it('流里返回的错误', async () => {
    mockFetch.mockImplementation(
      sseResponse([delta('半'), 'data: {"error":{"message":"quota exceeded"}}\n\n']),
    );
    await expect(chatCompletion(CONFIG, MESSAGES)).rejects.toMatchObject({
      kind: 'http',
      message: 'quota exceeded',
    });
  });

  it('没有内容时报 empty', async () => {
    mockFetch.mockImplementation(sseResponse(['data: [DONE]\n\n']));
    await expect(chatCompletion(CONFIG, MESSAGES)).rejects.toMatchObject({ kind: 'empty' });
  });

  it('请求发不出去时报 network', async () => {
    mockFetch.mockRejectedValue(new Error('Network request failed'));
    await expect(chatCompletion(CONFIG, MESSAGES)).rejects.toMatchObject({ kind: 'network' });
  });

  it('中途断开时报 network', async () => {
    mockFetch.mockImplementation(
      sseResponse([delta('半'), { fail: new Error('connection lost') }]),
    );
    await expect(chatCompletion(CONFIG, MESSAGES)).rejects.toMatchObject({ kind: 'network' });
  });

  it('两块数据之间超时报 timeout', async () => {
    mockFetch.mockImplementation(sseResponse([delta('a'), { wait: 200 }, delta('b')]));
    await expect(chatCompletion(CONFIG, MESSAGES, { timeoutMs: 50 })).rejects.toMatchObject({
      kind: 'timeout',
    });
  });

  it('每收到一块数据重新计时，总时长超过超时时间也不算超时', async () => {
    mockFetch.mockImplementation(
      sseResponse([delta('a'), { wait: 30 }, delta('b'), { wait: 30 }, delta('c')]),
    );
    expect(await chatCompletion(CONFIG, MESSAGES, { timeoutMs: 50 })).toBe('abc');
  });

  it('调用方取消时抛 AbortError', async () => {
    mockFetch.mockImplementation(sseResponse([delta('a'), { wait: 1000 }, delta('b')]));
    const controller = new AbortController();
    const seen: string[] = [];
    const pending = chatCompletion(CONFIG, MESSAGES, {
      signal: controller.signal,
      onText: (t) => {
        seen.push(t);
        controller.abort();
      },
    });
    const error = await pending.catch((e: unknown) => e);
    expect(isAbortError(error)).toBe(true);
    expect(seen).toEqual(['a']);
  });

  it('已经取消的 signal 不发请求', async () => {
    const controller = new AbortController();
    controller.abort();
    const error = await chatCompletion(CONFIG, MESSAGES, { signal: controller.signal }).catch(
      (e: unknown) => e,
    );
    expect(isAbortError(error)).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
