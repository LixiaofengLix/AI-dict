import type { AiDictEntry } from '../../../types/ai';
import type { Accent } from '../../../types/settings';

import type { ChatMessage } from '../client';
import { AiError } from '../errors';
import { extractJsonObject, list, str } from './json';
import { DIRECT, fillInstruction, JSON_ONLY, SHORT_EXAMPLE } from './style';

/** 解析时最多留这么多条，提示词里写得再多也只显示这些 */
const MAX_SENSES = 6;

/** 默认的可改部分：角色、风格和内容要求。设置页里改的就是这一段 */
export const DEFAULT_AI_DICTIONARY_INSTRUCTION = [
  '你是面向中文读者的英汉双解词典。',
  DIRECT,
  `- 常用义项按常用程度排列，最多 ${MAX_SENSES} 条，罕见义项不列`,
  '- meaning 是简短的中文释义（近义用"；"分隔），definition 是对应的简短英文释义',
  `- ${SHORT_EXAMPLE}`,
].join('\n');

const EXAMPLE = {
  word: 'go',
  phonetic: 'ɡoʊ',
  senses: [
    {
      pos: 'v.',
      meaning: '去；走',
      definition: 'to move or travel from one place to another',
      example: 'I went to my doctor last week.',
      exampleTranslation: '我上周去看了医生。',
    },
  ],
};

/**
 * system 是可改的那段（instruction），user 是固定的：查询的词 + 输出格式。
 * 格式这部分解析器要靠它，设置页里不让改。
 */
export function aiDictionaryMessages(
  word: string,
  sentence: string,
  accent: Accent,
  instruction = DEFAULT_AI_DICTIONARY_INSTRUCTION,
): ChatMessage[] {
  const accentName = accent === 'uk' ? '英式' : '美式';
  return [
    { role: 'system', content: fillInstruction(instruction, { word, sentence }) },
    {
      role: 'user',
      content: [
        `查询的词：${word}`,
        ...(sentence ? [`原句（只用来判断原形和词性，释义要覆盖常用义项）：${sentence}`] : []),
        '',
        `${JSON_ONLY}按这个格式返回原形的词典条目：`,
        JSON.stringify(EXAMPLE),
        '',
        '字段规则：',
        '- word：原形（went 写 go，magazines 写 magazine；专有名词保留大小写）',
        `- phonetic：原形的${accentName}国际音标，不带斜杠或方括号`,
        '- senses：义项数组；pos 用 n. v. adj. 等缩写；meaning 是中文释义，definition 是英文释义；',
        '  example 是英文例句，exampleTranslation 是它的中文翻译',
      ].join('\n'),
    },
  ];
}

function cleanPhonetic(value: unknown): string | null {
  const text = str(value)
    .replace(/^[/[]+|[/\]]+$/g, '')
    .trim();
  return text || null;
}

/** 校验模型返回的 JSON；缺字段时用空值补上，一条释义都没有才算失败 */
export function parseAiDictionary(text: string, query: string): AiDictEntry {
  const json = extractJsonObject(text);
  const senses = list(json.senses, (s) => {
    const meaning = str(s.meaning);
    return meaning
      ? {
          pos: str(s.pos),
          meaning,
          definition: str(s.definition),
          example: str(s.example),
          exampleTranslation: str(s.exampleTranslation),
        }
      : null;
  }).slice(0, MAX_SENSES);
  if (senses.length === 0) {
    throw new AiError('format', '词典条目没有释义');
  }
  return {
    word: str(json.word) || query,
    phonetic: cleanPhonetic(json.phonetic),
    senses,
  };
}
