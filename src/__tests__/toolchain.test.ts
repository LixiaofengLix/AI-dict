import { describe, expect, it } from 'vitest';

// 工具链自检：确认 Vitest 能跑 TypeScript。
// 4.1 起被真实用例（输入分类等纯逻辑）取代。
describe('测试环境', () => {
  it('能运行 TypeScript 用例', () => {
    const value: string = 'ok';
    expect(value).toBe('ok');
  });
});
