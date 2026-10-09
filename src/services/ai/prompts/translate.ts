import { classifyInput } from '../../../utils/classifyInput';
import type { ChatMessage } from '../client';
import type { PassageContext } from '../types';
import { passageBlock } from './passage';
import { DIRECT } from './style';

/** 翻译方向（5.1）：主要是中文的输入走中译英，其余走英译中 */
export type TranslateDirection = 'toChinese' | 'toEnglish';

/** 两节的标题：prompt 让模型照它输出，界面也照它解析（见 parseSections） */
export const TRANSLATION_HEADINGS = {
  toChinese: ['中文翻译', '句意解释'],
  toEnglish: ['英文翻译', '句意解释'],
} as const satisfies Record<TranslateDirection, readonly [string, string]>;

/** 按 5.1 的输入分类定方向：中文输入整句中译英，其余（句子）英译中 */
export function translateDirection(text: string): TranslateDirection {
  return classifyInput(text) === 'chinese' ? 'toEnglish' : 'toChinese';
}

const SYSTEM = [
  '你是英译中的译者兼英语老师，帮中文用户看懂英文。',
  '用简体中文回答，只用题目给的 Markdown 格式。',
  DIRECT,
].join('\n');

const SYSTEM_TO_ENGLISH = [
  '你是中译英的译者，帮中文用户把想说的话写成地道的英文。',
  '用简体中文说明，只用题目给的 Markdown 格式。',
  DIRECT,
].join('\n');

/** 选中内容前后的上下文只用来理解，各方向都要交代一句 */
const HANDLE = '只处理【选中的内容】，上下文仅用于理解指代和语境。按格式输出：';

/** 英译中：中文翻译 + 句意解释 */
const SECTIONS_TO_CHINESE = [
  '## 中文翻译',
  '忠实、通顺的译文，保留语气和修辞；人名、地名用通行译名。',
  '',
  '## 句意解释',
  '1–2 句、不超过 80 字：只讲中文用户容易读不懂的地方——指代、言外之意、幽默或讽刺；不复述译文。',
].join('\n');

/** 中译英：英文翻译 + 句意解释（讲选词，帮用户学会自己表达） */
const SECTIONS_TO_ENGLISH = [
  '## 英文翻译',
  '自然、地道的英文，符合英语的表达习惯，不要逐字直译。',
  '',
  '## 句意解释',
  '1–2 句、不超过 80 字：只讲用词和语气上容易拿不准的地方——为什么选这个词、直译会错在哪；不复述译文。',
].join('\n');

export function translateMessages(
  input: PassageContext,
  direction: TranslateDirection,
): ChatMessage[] {
  const toEnglish = direction === 'toEnglish';
  return [
    { role: 'system', content: toEnglish ? SYSTEM_TO_ENGLISH : SYSTEM },
    {
      role: 'user',
      content: [
        passageBlock(input),
        '',
        HANDLE,
        toEnglish ? SECTIONS_TO_ENGLISH : SECTIONS_TO_CHINESE,
        '',
        '只输出这两节。',
      ].join('\n'),
    },
  ];
}
