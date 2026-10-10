import { describe, expect, it } from 'vitest';
import { joinOcrLines } from '../joinOcrLines';

describe('joinOcrLines', () => {
  it('英文折行用空格接回一句', () => {
    expect(joinOcrLines(['The team went over the numbers before the', 'launch.'])).toBe(
      'The team went over the numbers before the launch.',
    );
  });

  it('行尾连字符拆开的词接回整词', () => {
    expect(joinOcrLines(['a careful trans-', 'lation of the text'])).toBe(
      'a careful translation of the text',
    );
  });

  it('下一行大写开头时是复合词，连字符保留、不加空格', () => {
    expect(joinOcrLines(['the Austro-', 'Hungarian empire'])).toBe('the Austro-Hungarian empire');
  });

  it('前面是空格的连字符是破折号，照常加空格', () => {
    expect(joinOcrLines(['it was late -', 'too late'])).toBe('it was late - too late');
  });

  it('中文折行不加空格', () => {
    expect(
      joinOcrLines([
        '「go over」在这里是逐条核对、过一遍的意思，不',
        '是「走过去」；went是 go 的过去式。',
      ]),
    ).toBe('「go over」在这里是逐条核对、过一遍的意思，不是「走过去」；went是 go 的过去式。');
  });

  it('中文接英文、英文接中文都不加空格', () => {
    expect(joinOcrLines(['它和go 组', '成短语动词 go over'])).toBe('它和go 组成短语动词 go over');
    expect(joinOcrLines(['go over', '是短语动词'])).toBe('go over是短语动词');
  });

  it('汉字之间的空格去掉（Windows OCR 每个字之间都带空格），中英文之间的保留', () => {
    expect(joinOcrLines(['团 队 在 发 布 前 把 数 据 过 了 一 遍 。'])).toBe(
      '团队在发布前把数据过了一遍。',
    );
    expect(joinOcrLines(['它 和 go 组 成 短 语 动 词'])).toBe('它和 go 组成短语动词');
  });

  it('空行和首尾空白去掉，全空给空串', () => {
    expect(joinOcrLines(['  went  ', '', '   '])).toBe('went');
    expect(joinOcrLines([])).toBe('');
  });
});
