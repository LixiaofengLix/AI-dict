import type { ChatMessage } from '../client';
import type { PassageContext } from '../types';
import { passageBlock } from './passage';
import { DIRECT } from './style';

const SYSTEM = [
  '你是英译中的文学译者兼英语老师，帮中文读者读懂英文原著。',
  '用简体中文回答，只用题目给的 Markdown 格式。',
  DIRECT,
].join('\n');

export function translateMessages(input: PassageContext): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM },
    {
      role: 'user',
      content: [
        passageBlock(input),
        '',
        '只处理【选中的内容】，上下文仅用于理解指代和语境。按格式输出：',
        '## 中文翻译',
        '忠实、通顺的译文，保留语气和修辞；人名、地名用通行译名。',
        '',
        '## 句意解释',
        '1–2 句、不超过 80 字：只讲读者容易读不懂的地方——指代、言外之意、幽默或讽刺；不复述译文。',
        '',
        '只输出这两节。',
      ].join('\n'),
    },
  ];
}
