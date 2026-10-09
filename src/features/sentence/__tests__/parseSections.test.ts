import { describe, expect, it } from 'vitest';
import { parseSections, splitBold } from '../parseSections';

const HEADINGS = ['句型分析', '语法要点'] as const;

describe('parseSections', () => {
  it('按标题切分段落和列表', () => {
    const result = parseSections(
      '## 句型分析\n这是简单句。\n\n- **I**：主语\n\n## 语法要点\n* **in myself**：自身',
      HEADINGS,
    );
    expect(result['句型分析']).toEqual([
      { bullet: false, text: '这是简单句。' },
      { bullet: true, text: '**I**：主语' },
    ]);
    expect(result['语法要点']).toEqual([{ bullet: true, text: '**in myself**：自身' }]);
  });

  it('还没输出的节是 null，标题前的内容归到第一节', () => {
    const result = parseSections('前言\n## 句型', HEADINGS);
    expect(result['句型分析']).toEqual([{ bullet: false, text: '前言' }]);
    expect(result['语法要点']).toBeNull();
  });

  it('标题刚出现、还没有内容时是空数组', () => {
    expect(parseSections('## 语法要点\n', HEADINGS)['语法要点']).toEqual([]);
  });

  it('翻译输出中途的半截文本也能解析', () => {
    const headings = ['中文翻译', '句意解释'] as const;
    const result = parseSections('## 中文翻译\n我正要出门时\n## 句', headings);
    expect(result['中文翻译']).toEqual([{ bullet: false, text: '我正要出门时' }]);
    expect(result['句意解释']).toBeNull();
  });
});

describe('splitBold', () => {
  it('切出加粗片段，去掉没闭合的 **', () => {
    expect(splitBold('a **b** c **d')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c d', bold: false },
    ]);
  });
});
