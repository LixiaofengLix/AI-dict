import { ENGLISH_WORD } from '../../utils/classifyInput';

/**
 * 原句渲染用的一段。kind 为 'word' 的可以点（text 就是要查的词），
 * 其余是标点、空格，照原样显示。
 */
export type SentencePart =
  { kind: 'word'; text: string; sentence: string } | { kind: 'text'; text: string };

/** 分句用 Intl.Segmenter：Mr. 之类的缩写、省略号比自己写正则稳 */
const SENTENCE_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'sentence' });

/**
 * 把选中的文字切成渲染用的小段（5.2）：先按句切，句内再按词切，标点、空格不可点。
 * 每个词带上它所在的句子（去掉首尾空白），点词时直接当语境用——选中一段话时，
 * 点第 2 句里的词，AI 只拿第 2 句（5.3）。
 * 词的形状和输入分类共用一套（utils/classifyInput 的 ENGLISH_WORD），
 * 中文、符号都切不出词，整段就是不可点的文字——中文输入本来也不做句中取词（5.1）。
 * 各段拼回去等于原文：多一个空格少一个换行，渲染出来就不像原句了。
 */
export function splitWords(text: string): SentencePart[] {
  const parts: SentencePart[] = [];
  for (const { segment } of SENTENCE_SEGMENTER.segment(text)) {
    const sentence = segment.trim();
    let end = 0;
    for (const match of segment.matchAll(ENGLISH_WORD)) {
      const start = match.index;
      if (start > end) parts.push({ kind: 'text', text: segment.slice(end, start) });
      parts.push({ kind: 'word', text: match[0], sentence });
      end = start + match[0].length;
    }
    if (end < segment.length) parts.push({ kind: 'text', text: segment.slice(end) });
  }
  return parts;
}
