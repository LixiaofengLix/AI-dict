/**
 * 增量解析 Server-Sent Events。网络分块可能在任意位置切断一行，
 * 所以把最后一段不完整的行留在缓冲区，等下一块数据再拼上。
 * 每个事件的 data 行用换行拼接后回调一次；注释行（以 ":" 开头）和其他字段忽略。
 */
export function createSseParser(onData: (data: string) => void) {
  let buffer = '';
  let dataLines: string[] = [];

  const dispatch = () => {
    if (dataLines.length > 0) {
      onData(dataLines.join('\n'));
      dataLines = [];
    }
  };

  const handleLine = (raw: string) => {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    if (line === '') {
      dispatch();
      return;
    }
    if (line.startsWith(':')) {
      return;
    }
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    if (field !== 'data') {
      return;
    }
    const value = colon === -1 ? '' : line.slice(colon + 1);
    dataLines.push(value.startsWith(' ') ? value.slice(1) : value);
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(handleLine);
    },
    /** 响应结束：有的服务最后一个事件后面不带空行 */
    end() {
      if (buffer) {
        handleLine(buffer);
        buffer = '';
      }
      dispatch();
    },
  };
}

export type StreamChunk =
  { type: 'done' } | { type: 'delta'; text: string } | { type: 'error'; message: string };

/** 解析 /chat/completions 流式响应里的一个 data；无法识别的内容当作空增量 */
export function parseStreamChunk(data: string): StreamChunk {
  if (data.trim() === '[DONE]') {
    return { type: 'done' };
  }
  let json: unknown;
  try {
    json = JSON.parse(data);
  } catch {
    return { type: 'delta', text: '' };
  }
  const message = errorMessageOf(json);
  if (message !== null) {
    return { type: 'error', message };
  }
  const choice = (json as { choices?: { delta?: { content?: unknown } }[] }).choices?.[0];
  const content = choice?.delta?.content;
  return { type: 'delta', text: typeof content === 'string' ? content : '' };
}

/** OpenAI 格式的错误体 {"error": {"message": "..."}}，也兼容 error 直接是字符串 */
export function errorMessageOf(json: unknown): string | null {
  if (typeof json !== 'object' || json === null || !('error' in json)) {
    return null;
  }
  const error = (json as { error: unknown }).error;
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return null;
}
