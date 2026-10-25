/**
 * 输入分类：拿到文字后先在本地判断走哪个模式，不调 AI。
 * 分错了不提供手动切换，改一次选区重新划就行。
 */

/** 中文字符（含扩展区），用来算"主要是中文" */
const HAN = /\p{Script=Han}/u;

/**
 * 英文词：拉丁字母，内部可以有撇号、连字符或数字（don't、well-known、COVID-19），
 * 用来数词数。中文、日文假名之类都不是拉丁字母，不会算进来。
 * 句子模式的原句分词（features/sentence/splitWords）共用一个形状，两边别各写一份。
 */
export const ENGLISH_WORD =
  /[\p{Script=Latin}\p{M}\p{N}]+(?:['’-][\p{Script=Latin}\p{M}\p{N}]+)*/gu;

/** 句末标点：出现一个就不是词组的形状了 */
const SENTENCE_END = /[.!?。！？…]/;

/** 不超过这么多英文词才算单词 / 词组；"out of the blue" 这类四词习语要能进来 */
const MAX_WORD_COUNT = 4;

export type InputKind =
  /** 主要是中文：整句中译英，不做句中取词 */
  | 'chinese'
  /** 单词 / 词组：走单词模式，出词卡 */
  | 'word'
  /** 其余：走句子模式，英译中 */
  | 'sentence';

/**
 * 判断一段文字该进哪个模式。三种去向见 5.1：
 * - 主要是中文 → 'chinese'
 * - 不超过 4 个英文词、没有句末标点（went、give up、in terms of）→ 'word'
 * - 其余 → 'sentence'
 */
export function classifyInput(text: string): InputKind {
  // 中文占比按非空白字符算：空格、换行不该把中文稀释成英文。
  // 标点不算中文，但带标点的中文句子占比也远高于一半，不用单独处理
  let han = 0;
  let total = 0;
  for (const char of text) {
    if (/\s/.test(char)) continue;
    total += 1;
    if (HAN.test(char)) han += 1;
  }
  if (han > 0 && han * 2 > total) return 'chinese';

  // 夹了中文的英文文字（比如英文句子里引用了一个中文词）不当词组：
  // 词组模式只服务纯英文的词 / 短语，这种交给句子模式去翻译更稳
  const words = han === 0 ? (text.match(ENGLISH_WORD) ?? []) : [];
  if (words.length > 0 && words.length <= MAX_WORD_COUNT && !SENTENCE_END.test(text)) {
    return 'word';
  }
  return 'sentence';
}
