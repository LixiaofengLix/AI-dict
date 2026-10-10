/** 所有 prompt 共用：少输出、快出首字 */
export const DIRECT = '直接给出答案，不写思考过程、开场白、总结或客套话；语言简练，不重复。';

/** JSON 类 prompt 共用（属于固定的格式部分，用户改不到） */
export const JSON_ONLY = '只输出一个 JSON 对象，不要其他文字，不用代码块包裹。';

/** 例句都要短，减少输出 */
export const SHORT_EXAMPLE = '例句自然、不超过 15 个词';

/**
 * 把可改的提示词里的占位符换成这次请求的值：{word} 是查询的词，{sentence} 是原句。
 * 不认识的花括号原样保留。
 */
export function fillInstruction(
  instruction: string,
  values: { word?: string; sentence?: string },
): string {
  return instruction.replace(/\{(word|sentence)\}/g, (match, name: 'word' | 'sentence') => {
    const value = values[name];
    return value === undefined ? match : value;
  });
}
