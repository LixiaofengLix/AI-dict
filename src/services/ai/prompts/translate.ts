import { classifyInput } from '../../../utils/classifyInput';
import type { ChatMessage } from '../client';
import type { PassageContext } from '../types';
import { passageBlock } from './passage';
import { DIRECT } from './style';

/** 翻译方向（5.1）：主要是中文的输入走中译英，其余走英译中 */
export type TranslateDirection = 'toChinese' | 'toEnglish';

/**
 * 各节的标题：prompt 让模型照它输出，界面也照它解析（见 parseSections）。
 * 英译中只要译文（样张 01）；中译英多一节句意解释讲选词（样张 03）。
 */
export const TRANSLATION_HEADINGS = {
  toChinese: ['中文翻译'],
  toEnglish: ['英文翻译', '句意解释'],
} as const satisfies Record<TranslateDirection, readonly [string] | readonly [string, string]>;

/** 按 5.1 的输入分类定方向：中文输入整句中译英，其余（句子）英译中 */
export function translateDirection(text: string): TranslateDirection {
  return classifyInput(text) === 'chinese' ? 'toEnglish' : 'toChinese';
}

/** 英译中默认的可改部分：角色、风格和译文要求。设置页里改的就是这一段 */
export const DEFAULT_TRANSLATE_TO_CHINESE_INSTRUCTION = [
  '你是英译中的译者兼英语老师，帮中文用户看懂英文。',
  DIRECT,
  '译文忠实、通顺，保留语气和修辞；人名、地名用通行译名。',
  '原文里的短语动词、习语这类难点，把它们的中文译法用 **加粗** 标出，最多 2 处，没有就不标。',
].join('\n');

/** 中译英默认的可改部分：译文要求 + 句意解释讲什么（讲选词，帮用户学会自己表达） */
export const DEFAULT_TRANSLATE_TO_ENGLISH_INSTRUCTION = [
  '你是中译英的译者，帮中文用户把想说的话写成地道的英文。说明部分用简体中文。',
  DIRECT,
  '英文翻译：自然、地道的英文，符合英语的表达习惯，不要逐字直译；最值得学的 1–2 个表达用 **加粗** 标出。',
  '句意解释：1–2 条，每条不超过 50 字，只讲用词和语气上容易拿不准的地方——原文的「某个说法」为什么译成 **某个英文**、直译会错在哪；不复述译文。',
].join('\n');

/** 选中内容前后的上下文只用来理解，各方向都要交代一句 */
const HANDLE = '只处理【选中的内容】，上下文仅用于理解指代和语境。';

/**
 * 固定的格式部分：界面按这些标题切节（parseSections），所以不让改。
 * 英译中只要译文（样张 01）；中译英多一节句意解释，每条一个列表项（样张 03）。
 */
const FORMAT_TO_CHINESE = [
  '按下面的格式输出，标题原样保留，只用这里出现的 Markdown；只输出这一节，不要解释：',
  `## ${TRANSLATION_HEADINGS.toChinese[0]}`,
  '（译文）',
].join('\n');

const FORMAT_TO_ENGLISH = [
  '按下面的格式输出，标题原样保留，只用这里出现的 Markdown；只输出这两节：',
  `## ${TRANSLATION_HEADINGS.toEnglish[0]}`,
  '（译文）',
  '',
  `## ${TRANSLATION_HEADINGS.toEnglish[1]}`,
  '- （每条以 "- " 开头，一条一行）',
].join('\n');

/** system 是可改的那段（instruction），user 是固定的：选中的内容 + 输出格式 */
export function translateMessages(
  input: PassageContext,
  direction: TranslateDirection,
  instruction?: string,
): ChatMessage[] {
  const toEnglish = direction === 'toEnglish';
  const system =
    instruction ??
    (toEnglish
      ? DEFAULT_TRANSLATE_TO_ENGLISH_INSTRUCTION
      : DEFAULT_TRANSLATE_TO_CHINESE_INSTRUCTION);
  return [
    { role: 'system', content: system },
    {
      role: 'user',
      content: [
        passageBlock(input),
        '',
        HANDLE,
        toEnglish ? FORMAT_TO_ENGLISH : FORMAT_TO_CHINESE,
      ].join('\n'),
    },
  ];
}
