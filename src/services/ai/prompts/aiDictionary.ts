import type { AiDictEntry } from '../../../types/ai';
import type { Accent } from '../../../types/settings';

import type { ChatMessage } from '../client';
import { AiError } from '../errors';
import { extractJsonObject, list, str } from './json';
import { DIRECT, JSON_ONLY, SHORT_EXAMPLE } from './style';

const MAX_SENSES = 6;

const SYSTEM = ['你是面向中文读者的英汉双解词典。', JSON_ONLY, DIRECT].join('\n');

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

export function aiDictionaryMessages(
  word: string,
  sentence: string,
  accent: Accent,
): ChatMessage[] {
  const accentName = accent === 'uk' ? '英式' : '美式';
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        `查询的词：${word}`,
        ...(sentence ? [`原句（只用来判断原形和词性，释义要覆盖常用义项）：${sentence}`] : []),
        '',
        '按这个格式返回原形的词典条目：',
        JSON.stringify(EXAMPLE),
        '',
        '要求：',
        '- word：原形（went 写 go，magazines 写 magazine；专有名词保留大小写）',
        `- phonetic：原形的${accentName}国际音标，不带斜杠或方括号`,
        `- senses：常用义项按常用程度排列，最多 ${MAX_SENSES} 条，罕见义项不列；pos 用 n. v. adj. 等缩写；`,
        '  meaning 是简短的中文释义（近义用"；"分隔），definition 是对应的简短英文释义；',
        `  ${SHORT_EXAMPLE}，exampleTranslation 是它的中文翻译`,
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
