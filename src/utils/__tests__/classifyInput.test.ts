import { describe, expect, it } from 'vitest';
import { classifyInput } from '../classifyInput';

describe('classifyInput：中文', () => {
  it('纯中文', () => {
    expect(classifyInput('苹果')).toBe('chinese');
  });

  it('带全角标点的中文', () => {
    expect(classifyInput('你好，世界！')).toBe('chinese');
  });

  it('中文为主、夹几个英文词，仍算中文', () => {
    expect(classifyInput('他说这张 photo 很好看')).toBe('chinese');
  });

  it('英文为主、夹中文词，不算中文', () => {
    expect(classifyInput('The word 你好 means hello')).toBe('sentence');
  });
});

describe('classifyInput：单词 / 词组', () => {
  it('单个词', () => {
    expect(classifyInput('went')).toBe('word');
  });

  it('两个词的短语', () => {
    expect(classifyInput('give up')).toBe('word');
  });

  it('带介词的三词短语', () => {
    expect(classifyInput('in terms of')).toBe('word');
  });

  it('四个词的习语也算词组（词数上限）', () => {
    expect(classifyInput('out of the blue')).toBe('word');
  });

  it('撇号、连字符不算词的分界（don’t、well-known 都是一个词）', () => {
    expect(classifyInput("don't")).toBe('word');
    expect(classifyInput('well-known')).toBe('word');
  });

  it('首尾的引号、逗号、空白不挡路', () => {
    expect(classifyInput('“give up”')).toBe('word');
    expect(classifyInput('went,')).toBe('word');
    expect(classifyInput('  went  ')).toBe('word');
  });
});

describe('classifyInput：句子', () => {
  it('五个英文词就超了', () => {
    expect(classifyInput('the quick brown fox jumps')).toBe('sentence');
  });

  it('一整句', () => {
    expect(classifyInput('The alarm went off just as I was about to leave.')).toBe('sentence');
  });

  it.each(['.', '!', '?', '。', '！', '？', '…'])(
    '有句末标点 %s 就按句子处理，哪怕只有一个词',
    (mark) => {
      expect(classifyInput(`went${mark}`)).toBe('sentence');
    },
  );

  it('没有英文词的输入（纯符号、emoji）按句子兜底', () => {
    expect(classifyInput('😀')).toBe('sentence');
  });

  it('空文本按句子兜底（调用方本来就不会传空，只是别抛错）', () => {
    expect(classifyInput('')).toBe('sentence');
  });
});
