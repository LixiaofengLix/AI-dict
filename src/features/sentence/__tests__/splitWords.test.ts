import { describe, expect, it } from 'vitest';
import { splitWords } from '../splitWords';

/** 把可点的词用 [] 标出来，方便和原文对着看 */
const shape = (text: string) =>
  splitWords(text)
    .map((part) => (part.kind === 'word' ? `[${part.text}]` : part.text))
    .join('');

/** 词和它所属的句子 */
const words = (text: string) =>
  splitWords(text).flatMap((part) => (part.kind === 'word' ? [[part.text, part.sentence]] : []));

describe('splitWords', () => {
  it('词可点，标点和空格不可点', () => {
    expect(shape('The alarm went off just as I was about to leave.')).toBe(
      '[The] [alarm] [went] [off] [just] [as] [I] [was] [about] [to] [leave].',
    );
  });

  it('撇号、连字符在词内部（don’t、well-known 是一个词）', () => {
    expect(shape("It's a well-known fact, don't you think?")).toBe(
      "[It's] [a] [well-known] [fact], [don't] [you] [think]?",
    );
  });

  it('拼回去等于原文（换行、多余空格都留着）', () => {
    const text = 'The alarm went off,\njust as I was about to leave.';
    expect(
      splitWords(text)
        .map((part) => part.text)
        .join(''),
    ).toBe(text);
  });

  it('段落按句切分，每个词带上自己那一句', () => {
    expect(words('The alarm went off. I was about to leave!')).toEqual([
      ['The', 'The alarm went off.'],
      ['alarm', 'The alarm went off.'],
      ['went', 'The alarm went off.'],
      ['off', 'The alarm went off.'],
      ['I', 'I was about to leave!'],
      ['was', 'I was about to leave!'],
      ['about', 'I was about to leave!'],
      ['to', 'I was about to leave!'],
      ['leave', 'I was about to leave!'],
    ]);
  });

  it('句子的首尾空白不算进语境（换行后的缩进）', () => {
    const sentences = new Set(
      splitWords('The alarm went off.\n  I was about to leave.').flatMap((part) =>
        part.kind === 'word' ? [part.sentence] : [],
      ),
    );
    expect(sentences).toEqual(new Set(['The alarm went off.', 'I was about to leave.']));
  });

  it('中文和纯符号切不出可点的词（中文输入不做句中取词）', () => {
    expect(shape('我差点迟到，因为闹钟没响。')).toBe('我差点迟到，因为闹钟没响。');
    expect(shape('—— …… “ ”')).toBe('—— …… “ ”');
  });
});
