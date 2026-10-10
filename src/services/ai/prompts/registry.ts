import type { Accent, PromptKind, PromptOverrides } from '../../../types/settings';
import type { ChatMessage } from '../client';
import { aiDictionaryMessages, DEFAULT_AI_DICTIONARY_INSTRUCTION } from './aiDictionary';
import { collocationsMessages, DEFAULT_COLLOCATIONS_INSTRUCTION } from './collocations';
import { contextMeaningMessages, DEFAULT_CONTEXT_MEANING_INSTRUCTION } from './contextMeaning';
import {
  DEFAULT_TRANSLATE_TO_CHINESE_INSTRUCTION,
  DEFAULT_TRANSLATE_TO_ENGLISH_INSTRUCTION,
  translateMessages,
} from './translate';
import { DEFAULT_WORD_CLUSTER_INSTRUCTION, wordClusterMessages } from './wordCluster';

/**
 * 每个 prompt 分两段：
 * - 可改的（system）：角色、风格和内容要求，设置页里能改，存在 settings 表；
 * - 固定的（user）：这次的输入 + 输出格式。界面靠这个格式解析，所以不让改。
 */
export const PROMPT_MODES: readonly { kind: PromptKind; label: string; placeholders: string }[] = [
  {
    kind: 'contextMeaning',
    label: '语境释义',
    placeholders: '{word} 会换成点的词，{sentence} 换成原句',
  },
  { kind: 'aiDictionary', label: 'AI 词典', placeholders: '{word} 会换成查询的词' },
  { kind: 'wordCluster', label: '单词簇', placeholders: '{word} 会换成查询的词' },
  { kind: 'collocations', label: '常见搭配', placeholders: '{word} 会换成查询的词' },
  { kind: 'translateToChinese', label: '英译中', placeholders: '' },
  { kind: 'translateToEnglish', label: '中译英', placeholders: '' },
];

export const DEFAULT_INSTRUCTIONS: Record<PromptKind, string> = {
  contextMeaning: DEFAULT_CONTEXT_MEANING_INSTRUCTION,
  aiDictionary: DEFAULT_AI_DICTIONARY_INSTRUCTION,
  wordCluster: DEFAULT_WORD_CLUSTER_INSTRUCTION,
  collocations: DEFAULT_COLLOCATIONS_INSTRUCTION,
  translateToChinese: DEFAULT_TRANSLATE_TO_CHINESE_INSTRUCTION,
  translateToEnglish: DEFAULT_TRANSLATE_TO_ENGLISH_INSTRUCTION,
};

/** 这次请求用的可改部分；没改过（或改成空白）时用默认 */
export function instructionOf(overrides: PromptOverrides, kind: PromptKind): string {
  const custom = overrides[kind]?.trim();
  return custom || DEFAULT_INSTRUCTIONS[kind];
}

/** djb2，只用来区分缓存，不求抗碰撞 */
function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) {
    h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/**
 * 缓存 key 里区分提示词版本：默认提示词为空（沿用原来的缓存），
 * 改过的按内容取指纹，改了提示词不会读到旧结果。
 */
export function promptVariant(instruction: string, kind: PromptKind): string {
  return instruction === DEFAULT_INSTRUCTIONS[kind] ? '' : `p${hash(instruction)}`;
}

/** 设置页展示用：固定部分里的输入换成占位说明 */
export function lockedPreview(kind: PromptKind, accent: Accent): string {
  const word = '{查询的词}';
  const sentence = '{原句}';
  const passage = { text: '{选中的内容}', before: '{上文（有的话）}', after: '{下文（有的话）}' };
  const userOf = (messages: ChatMessage[]) => messages[1]?.content ?? '';
  switch (kind) {
    case 'contextMeaning':
      return userOf(contextMeaningMessages(word, sentence));
    case 'aiDictionary':
      return userOf(aiDictionaryMessages(word, sentence, accent));
    case 'wordCluster':
      return userOf(wordClusterMessages(word, sentence));
    case 'collocations':
      return userOf(collocationsMessages(word, sentence));
    case 'translateToChinese':
      return userOf(translateMessages(passage, 'toChinese'));
    case 'translateToEnglish':
      return userOf(translateMessages(passage, 'toEnglish'));
  }
}
