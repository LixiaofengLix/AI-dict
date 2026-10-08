import { describe, expect, it } from 'vitest';
import { createSseParser, parseStreamChunk } from '../sse';

function collect(chunks: string[]) {
  const events: string[] = [];
  const parser = createSseParser((data) => events.push(data));
  chunks.forEach((chunk) => parser.push(chunk));
  parser.end();
  return events;
}

describe('createSseParser', () => {
  it('按空行切分事件', () => {
    expect(collect(['data: a\n\ndata: b\n\n'])).toEqual(['a', 'b']);
  });

  it('行在任意位置被切断也能拼回', () => {
    const text = 'data: {"x":1}\n\ndata: {"y":2}\n\n';
    for (let i = 1; i < text.length; i++) {
      expect(collect([text.slice(0, i), text.slice(i)])).toEqual(['{"x":1}', '{"y":2}']);
    }
  });

  it('支持 \\r\\n 换行', () => {
    expect(collect(['data: a\r\n\r\ndata: b\r\n', '\r\n'])).toEqual(['a', 'b']);
  });

  it('同一事件的多行 data 用换行拼接', () => {
    expect(collect(['data: line1\ndata: line2\n\n'])).toEqual(['line1\nline2']);
  });

  it('忽略注释行和其他字段', () => {
    expect(collect([': keep-alive\n\nevent: message\nid: 3\ndata: a\n\n'])).toEqual(['a']);
  });

  it('冒号后没有空格、没有冒号时也能解析', () => {
    expect(collect(['data:a\n\ndata\n\n'])).toEqual(['a', '']);
  });

  it('结尾没有空行时 end() 补发最后一个事件', () => {
    expect(collect(['data: a\n\ndata: [DONE]'])).toEqual(['a', '[DONE]']);
  });

  it('只有空行和注释时没有事件', () => {
    expect(collect(['\n\n: ping\n\n'])).toEqual([]);
  });
});

describe('parseStreamChunk', () => {
  it('取出 delta.content', () => {
    expect(parseStreamChunk('{"choices":[{"delta":{"content":"你好"}}]}')).toEqual({
      type: 'delta',
      text: '你好',
    });
  });

  it('[DONE] 表示结束', () => {
    expect(parseStreamChunk('[DONE]')).toEqual({ type: 'done' });
  });

  it('只有 role 或 reasoning_content 的块当作空增量', () => {
    expect(parseStreamChunk('{"choices":[{"delta":{"role":"assistant"}}]}')).toEqual({
      type: 'delta',
      text: '',
    });
    expect(
      parseStreamChunk('{"choices":[{"delta":{"content":null,"reasoning_content":"想"}}]}'),
    ).toEqual({ type: 'delta', text: '' });
  });

  it('流里返回的错误', () => {
    expect(parseStreamChunk('{"error":{"message":"quota exceeded"}}')).toEqual({
      type: 'error',
      message: 'quota exceeded',
    });
  });

  it('不是 JSON 时当作空增量', () => {
    expect(parseStreamChunk('not json')).toEqual({ type: 'delta', text: '' });
  });
});
