import type { PassageContext } from '../types';

/** 上下文只给模型理解用，放在选中内容前后，由各 prompt 说明不用处理 */
export function passageBlock({ text, before, after }: PassageContext): string {
  return [
    ...(before ? [`【上文】\n${before}`] : []),
    `【选中的内容】\n${text}`,
    ...(after ? [`【下文】\n${after}`] : []),
  ].join('\n\n');
}
