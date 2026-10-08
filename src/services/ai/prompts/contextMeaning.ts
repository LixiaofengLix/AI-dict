import type { ChatMessage } from '../client';
import { DIRECT } from './style';

const SYSTEM = [
  '你是英语阅读助手，帮中文读者读懂英文原著。',
  '用简体中文回答，不用 Markdown。',
  DIRECT,
].join('\n');

export function contextMeaningMessages(word: string, sentence: string): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        `原句：${sentence}`,
        `单词：${word}`,
        '',
        `解释 ${word} 在这句里的意思，不超过 80 字：`,
        `- 以"${word} 在这里指"开头，引号里给出此处的中文含义；`,
        '- 再用一句话结合句意说明；',
        '- 是变形词时说明原形；是口语、习语或不同于最常见的意思时点明；',
        '- 不照抄原句。',
      ].join('\n'),
    },
  ];
}
