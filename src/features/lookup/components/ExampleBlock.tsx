/** 正则里有特殊含义的字符要转义：查的词可能带点、连字符 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 把例句里出现的查询词（整词、不区分大小写）挑出来加粗 */
function highlight(example: string, terms: readonly string[]) {
  const words = terms.map((term) => term.trim()).filter(Boolean);
  if (words.length === 0) return example;
  // 长的先匹配：give up 和 give 都在时先吃掉 give up
  const pattern = words
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  const parts = example.split(
    new RegExp(`(?<![\\p{L}\\p{N}])(${pattern})(?![\\p{L}\\p{N}])`, 'iu'),
  );
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <b key={index} className="font-semibold text-ink">
        {part}
      </b>
    ) : (
      part
    ),
  );
}

/**
 * 例句 + 翻译（样张 .ex）：左侧浅灰竖线，例句和翻译接在同一行里，查的词加粗。
 * 释义、单词簇、常见搭配共用。
 */
export function ExampleBlock({
  example,
  translation,
  terms = [],
}: {
  example: string;
  translation?: string;
  /** 要加粗的词（查的词、它的原形、搭配本身） */
  terms?: readonly string[];
}) {
  if (!example) return null;
  return (
    <p className="mt-[5px] border-l-2 border-segment pl-2.5 text-footnote leading-[1.55] break-words text-ink-body">
      {highlight(example, terms)}
      {translation ? ` ${translation}` : null}
    </p>
  );
}
