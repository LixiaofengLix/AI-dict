/** 例句 + 翻译，左侧竖线；释义、单词簇、常见搭配共用 */
export function ExampleBlock({ example, translation }: { example: string; translation?: string }) {
  if (!example) return null;
  return (
    <div className="mt-1.5 border-l-2 border-line pl-2.5">
      <p className="text-footnote leading-5 text-ink-body">{example}</p>
      {translation ? <p className="text-footnote text-ink-soft">{translation}</p> : null}
    </div>
  );
}
