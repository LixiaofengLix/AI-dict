import type { ChatMessage } from '../client';
import { DIRECT, fillInstruction } from './style';

/**
 * 默认的可改部分：角色、风格和内容要求。设置页里改的就是这一段，
 * {word} 会换成点的那个词。
 */
export const DEFAULT_CONTEXT_MEANING_INSTRUCTION = [
  '你是英语阅读助手，帮中文用户理解他们正在读的英文。用简体中文回答。',
  DIRECT,
  '解释 {word} 在这句里的意思，不超过 60 字：',
  '- 以"{word} 在这里"开头，用「」给出此处的中文含义并加粗，如：went 在这里指**「去」**；',
  '- 它和句中别的词组成短语动词、固定搭配或习语时（点 off，真正要讲的是 go off），写出完整短语并加粗，解释整个短语在这句里的意思；',
  '- 是变形词时说明原形；是口语、习语或不同于最常见的意思时点明；常和哪类词搭配可以补半句；',
  '- 整句的译文界面上另有显示，不要翻译或复述整句，也不照抄原句。',
].join('\n');

/** 界面只认 **加粗**，别的 Markdown 会原样露出来，所以这条固定 */
const FORMAT = '输出一段纯文本，可以用 **加粗**，不用标题、列表、代码块等别的 Markdown。';

/** system 是可改的那段（instruction），user 是固定的：原句、单词 + 输出格式 */
export function contextMeaningMessages(
  word: string,
  sentence: string,
  instruction = DEFAULT_CONTEXT_MEANING_INSTRUCTION,
): ChatMessage[] {
  return [
    { role: 'system', content: fillInstruction(instruction, { word, sentence }) },
    {
      role: 'user',
      content: [`原句：${sentence}`, `单词：${word}`, '', FORMAT].join('\n'),
    },
  ];
}
