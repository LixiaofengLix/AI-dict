import type { ChatMessage } from '../client';
import { DIRECT } from './style';

const SYSTEM = [
  '你是英语阅读助手，帮中文用户理解他们正在读的英文。',
  '用简体中文回答，除了 **加粗** 不用别的 Markdown。',
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
        `解释 ${word} 在这句里的意思，不超过 60 字：`,
        `- 以"${word} 在这里"开头，用「」给出此处的中文含义并加粗，如：went 在这里指**「去」**；`,
        `- 它和句中别的词组成短语动词、固定搭配或习语时（点 off，真正要讲的是 go off），写出完整短语并加粗，解释整个短语在这句里的意思；`,
        '- 是变形词时说明原形；是口语、习语或不同于最常见的意思时点明；常和哪类词搭配可以补半句；',
        '- 整句的译文界面上另有显示，不要翻译或复述整句，也不照抄原句。',
      ].join('\n'),
    },
  ];
}
