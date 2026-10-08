import type { Collocation } from '../../../types/ai';

import type { ChatMessage } from '../client';
import { AiError } from '../errors';
import { extractJsonObject, list, str } from './json';
import { DIRECT, JSON_ONLY, SHORT_EXAMPLE } from './style';

const MAX_ITEMS = 6;

const SYSTEM = ['你是面向中文读者的英语词汇老师。', JSON_ONLY, DIRECT].join('\n');

const EXAMPLE = {
  collocations: [
    {
      phrase: 'go off',
      forms: ['go off', 'goes off', 'went off', 'gone off', 'going off'],
      meaning: '（闹钟）响；（炸弹）爆炸',
      example: 'My alarm went off at six.',
      exampleTranslation: '我的闹钟六点响了。',
    },
  ],
};

export function collocationsMessages(word: string, sentence: string): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        `查询的词：${word}`,
        ...(sentence ? [`原句（只用来判断原形和词性）：${sentence}`] : []),
        '',
        '按这个格式返回原形的常见搭配：',
        JSON.stringify(EXAMPLE),
        '',
        '要求：',
        `- 最多 ${MAX_ITEMS} 条最常用的，按常用程度排列：固定词组、短语动词、常见词语搭配`,
        '- phrase 用原形书写，可用 sb. / sth. 占位；meaning 是简短的中文释义',
        '- forms 列出这个搭配在文章里可能出现的全部写法，全部小写：包括 phrase 本身和其中动词、名词的各种变形；',
        '  用 / 表示的几种说法分开写；sb. / sth. 等占位词原样保留',
        `- ${SHORT_EXAMPLE}，exampleTranslation 是它的中文翻译`,
        '- 这个词没有常见搭配时 collocations 给空数组',
      ].join('\n'),
    },
  ];
}

const normalizeForm = (form: string) => form.trim().replace(/\s+/g, ' ').toLowerCase();

/** 去重、统一小写；phrase 本身总在第一个 */
function formsOf(phrase: string, forms: unknown): string[] {
  const listed = Array.isArray(forms) ? forms.filter((f) => typeof f === 'string') : [];
  return [...new Set([phrase, ...listed].map(normalizeForm))].filter(Boolean);
}

/** 校验模型返回的 JSON；按词组去重，缺中文释义的丢掉 */
export function parseCollocations(text: string): Collocation[] {
  const json = extractJsonObject(text);
  if (!Array.isArray(json.collocations)) {
    throw new AiError('format', '没有 collocations 字段');
  }
  const seen = new Set<string>();
  return list<Collocation>(json.collocations, (c) => {
    const phrase = str(c.phrase);
    const meaning = str(c.meaning);
    if (!phrase || !meaning || seen.has(phrase.toLowerCase())) {
      return null;
    }
    seen.add(phrase.toLowerCase());
    return {
      phrase,
      forms: formsOf(phrase, c.forms),
      meaning,
      example: str(c.example),
      exampleTranslation: str(c.exampleTranslation),
    };
  }).slice(0, MAX_ITEMS);
}
