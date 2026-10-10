import type { AiConfig } from '../../../types/ai';
import type { TranslateDirection } from '../prompts/translate';

import { mockLemma } from './aiWords';

/** 默认视为已配置，便于查看 AI 界面；在设置页清空 Key 可查看"未配置"状态 */
export const mockAiConfig: AiConfig = {
  apiKey: 'sk-mock-0000000000000000',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  thinking: 'none',
};

const CONTEXT_MEANINGS: Record<string, string> = {
  extraordinary:
    'extraordinary 在这里指"离奇的、不可思议的"。作者用 "a most extraordinary thing" 自嘲：每次读到药品广告，都会觉得自己正患着广告里说的那种病，而且病得最重。',
  seedy:
    'seedy 在这里是口语用法，指"身体不舒服、没精神"，不是"破旧的"。句中说大家都觉得不太舒服，并因此有点紧张。',
  malady:
    'malady 在这里就是"疾病"，比 disease 更书面。句中说作者把 26 个字母开头的病都读了一遍，结论是只有"女仆膝"这一种病自己没得。',
  giddiness:
    'giddiness 在这里指"头晕、眼花"。fits of giddiness 是"一阵阵的头晕"，Harris 说自己时不时头晕得不知道在做什么。',
  go: 'went 是 go 的过去式，这里就是"去"的意思。I went to my medical man 即"我去看了我的医生"。',
  magazine:
    'magazine 在这里指"杂志"，即定期出版的刊物。句中说他曾在杂志上读到过关于心脏出问题的症状的内容。',
};

export function mockContextMeaning(word: string, sentence: string): string {
  const known = CONTEXT_MEANINGS[mockLemma(word)];
  if (known) {
    return known;
  }
  const preview = sentence.length > 40 ? `${sentence.slice(0, 40)}…` : sentence;
  return `（mock）"${word}" 在句子 "${preview}" 中的语境释义。这里会显示 AI 结合上下文给出的中文解释。`;
}

const HOSPITAL = 'I was a hospital in myself.';

const TRANSLATIONS: Record<string, string> = {
  [HOSPITAL]: '我本身就是一家医院。',
  'There were four of us—George, and William Samuel Harris, and myself, and Montmorency.':
    '我们一共四个——乔治、威廉·塞缪尔·哈里斯、我，还有蒙莫朗西。',
  'We were all feeling seedy, and we were getting quite nervous about it.':
    '我们都觉得身体不太舒服，而且为此越来越紧张。',
};

const preview = (text: string) => (text.length > 60 ? `${text.slice(0, 60)}…` : text);

/** 翻译的回答格式：简单 Markdown，英译中只有"## 中文翻译"，中译英是"## 英文翻译"和"## 句意解释"两节 */
export function mockTranslation(text: string, direction: TranslateDirection): string {
  if (direction === 'toEnglish') {
    return [
      '## 英文翻译',
      `（mock translation）${text}`,
      '',
      '## 句意解释',
      `- （mock）这里会说明译文里为什么这么选词："${preview(text)}"`,
    ].join('\n');
  }
  const key = text.trim();
  return ['## 中文翻译', TRANSLATIONS[key] ?? `（mock 翻译）${text}`].join('\n');
}
