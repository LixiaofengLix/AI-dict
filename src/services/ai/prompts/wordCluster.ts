import type { ConfusableWord, RelatedWord, WordCluster, WordForm } from '../../../types/ai';

import type { ChatMessage } from '../client';
import { AiError } from '../errors';
import { extractJsonObject, list, str } from './json';
import { DIRECT, JSON_ONLY, SHORT_EXAMPLE } from './style';

/** 变形词的标签和显示顺序（PRD W-5） */
export const FORM_LABELS = [
  '原形',
  '第三人称单数',
  '过去式',
  '过去分词',
  '现在分词',
  '复数',
  '比较级',
  '最高级',
] as const;

const MAX_FAMILY = 6;
const MAX_CONFUSABLES = 4;

const SYSTEM = ['你是面向中文读者的英语词汇老师。', JSON_ONLY, DIRECT].join('\n');

const EXAMPLE = {
  forms: [
    { label: '原形', word: 'go' },
    { label: '第三人称单数', word: 'goes' },
    { label: '过去式', word: 'went' },
    { label: '过去分词', word: 'gone' },
    { label: '现在分词', word: 'going' },
  ],
  family: [
    {
      word: 'outgoing',
      pos: 'adj.',
      meaning: '外向的；即将离任的',
      example: 'He is friendly and outgoing.',
      exampleTranslation: '他友好又外向。',
    },
  ],
  confusables: [
    {
      word: 'come',
      meaning: '来',
      difference: 'go 是离开说话人所在的地方，come 是朝说话人所在的地方来',
      example: 'Come here! — I have to go now.',
      exampleTranslation: '过来！——我现在得走了。',
    },
  ],
};

export function wordClusterMessages(word: string, sentence: string): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        `查询的词：${word}`,
        ...(sentence ? [`原句（只用来判断原形和词性）：${sentence}`] : []),
        '',
        '按这个格式返回原形的"单词簇"：',
        JSON.stringify(EXAMPLE),
        '',
        '要求：',
        `- forms：第一项是 {"label": "原形"}；其余只列这个词实际存在的变形，label 只能是 ${FORM_LABELS.slice(1).join('、')}；`,
        '  动词列第三人称单数、过去式、过去分词、现在分词，可数名词列复数，形容词和副词有比较级、最高级时列出；没有的不列',
        `- family：常用的同根词、派生词，最多 ${MAX_FAMILY} 个；pos 用 n. v. adj. adv. 等缩写，meaning 是简短的中文释义`,
        `- confusables：拼写或意思容易混淆的词，最多 ${MAX_CONFUSABLES} 个；difference 用一句中文（不超过 40 字）说明区别`,
        `- ${SHORT_EXAMPLE}，exampleTranslation 是它的中文翻译`,
        '- 没有内容的组给空数组',
      ].join('\n'),
    },
  ];
}

type FormLabel = (typeof FORM_LABELS)[number];

function isFormLabel(label: string): label is FormLabel {
  return (FORM_LABELS as readonly string[]).includes(label);
}

function pickForms(value: unknown, query: string): WordForm[] {
  const byLabel = new Map<FormLabel, string>();
  for (const form of list(value, (f) => ({ label: str(f.label), word: str(f.word) }))) {
    if (isFormLabel(form.label) && form.word && !byLabel.has(form.label)) {
      byLabel.set(form.label, form.word);
    }
  }
  if (!byLabel.has('原形')) {
    byLabel.set('原形', query);
  }
  return FORM_LABELS.flatMap((label) => {
    const word = byLabel.get(label);
    return word ? [{ label, word }] : [];
  });
}

/** 列表按单词去重（界面用单词做 key），不区分大小写 */
function uniqueByWord<T extends { word: string }>(items: T[], exclude: string): T[] {
  const seen = new Set([exclude.toLowerCase()]);
  return items.filter((item) => {
    const key = item.word.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/** 校验模型返回的 JSON；三组字段都没有才算失败，有的词本来就只有原形、没有同根词 */
export function parseWordCluster(text: string, query: string): WordCluster {
  const json = extractJsonObject(text);
  if (![json.forms, json.family, json.confusables].some(Array.isArray)) {
    throw new AiError('format', '单词簇没有内容');
  }
  const forms = pickForms(json.forms, query);
  const lemma = forms[0].word;
  const family = uniqueByWord(
    list<RelatedWord>(json.family, (f) => {
      const word = str(f.word);
      const meaning = str(f.meaning);
      return word && meaning
        ? {
            word,
            pos: str(f.pos),
            meaning,
            example: str(f.example),
            exampleTranslation: str(f.exampleTranslation),
          }
        : null;
    }),
    lemma,
  ).slice(0, MAX_FAMILY);
  const confusables = uniqueByWord(
    list<ConfusableWord>(json.confusables, (c) => {
      const word = str(c.word);
      const meaning = str(c.meaning);
      return word && meaning
        ? {
            word,
            meaning,
            difference: str(c.difference),
            example: str(c.example),
            exampleTranslation: str(c.exampleTranslation),
          }
        : null;
    }),
    lemma,
  ).slice(0, MAX_CONFUSABLES);
  return { forms, family, confusables };
}
