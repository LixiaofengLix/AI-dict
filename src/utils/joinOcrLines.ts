/**
 * 把截图 OCR 认出的一行行文字拼成一段（docs/DEV_PLAN.md 阶段 8）。
 *
 * 截图里的换行只是排版折行，原文是一整段：英文按空格接回去，行尾用连字符拆开的词接回整词，
 * 中文两边不加空格。拼好之后和划词取到的文字一样走 5.1 分类、按句切分。
 */

/** 中文字符和全角标点（，。「」！？…）：挨着它们换行时不补空格 */
const CJK = /[\p{Script=Han}\u3000-\u303f\uff00-\uffef]/u;

/** 行尾的连字符：前面紧挨着字母（trans-\nlation），前面是空格的是破折号，照常加空格 */
const HYPHEN_END = /\p{L}-$/u;
const LOWER_START = /^\p{Ll}/u;

/** 两个中文字符（或全角标点）之间的空白：Windows 的 OCR 会在每个汉字之间都插一个空格 */
const SPACE_BETWEEN_CJK = new RegExp(`(?<=${CJK.source})\\s+(?=${CJK.source})`, 'gu');

export function joinOcrLines(lines: readonly string[]): string {
  let text = '';
  for (const raw of lines) {
    const line = raw.trim().replace(SPACE_BETWEEN_CJK, '');
    if (!line) continue;
    if (!text) {
      text = line;
    } else if (HYPHEN_END.test(text)) {
      // 下一行小写开头是一个词被折开了，去掉连字符；大写开头多半本来就是复合词（Austro-Hungarian）
      text = (LOWER_START.test(line) ? text.slice(0, -1) : text) + line;
    } else if (CJK.test(text.slice(-1)) || CJK.test(line[0] ?? '')) {
      text += line;
    } else {
      text += ` ${line}`;
    }
  }
  return text;
}
