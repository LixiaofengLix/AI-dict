/** 一节里的一行：段落或 "- " 列表项 */
export type Block = { bullet: boolean; text: string };

/**
 * 按 "## 标题" 把 AI 输出的简单 Markdown 切成几节，流式输出中途的半截文本也能解析。
 * 还没开始输出的节为 null；第一个标题之前的内容算第一节；不认识的标题忽略，内容归到上一节。
 */
export function parseSections<H extends string>(
  markdown: string,
  headings: readonly H[],
): Record<H, Block[] | null> {
  const result = Object.fromEntries(headings.map((h) => [h, null])) as Record<H, Block[] | null>;
  let section: H | null = null;
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('#')) {
      const heading = line.replace(/^#+\s*/, '');
      // 标题还没输出完整时先不切换小节
      if ((headings as readonly string[]).includes(heading)) {
        section = heading as H;
        result[section] ??= [];
      }
      continue;
    }
    if (!line) {
      continue;
    }
    const target = section ?? headings[0];
    const bullet = /^[-*•]\s+/.test(line);
    (result[target] ??= []).push({ bullet, text: bullet ? line.replace(/^[-*•]\s+/, '') : line });
  }
  return result;
}

/** 把 "**加粗**" 切成片段；流式输出中还没闭合的 ** 直接去掉 */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/\*\*(.+?)\*\*/)
    .map((part, i) => ({ text: part.replace(/\*\*/g, ''), bold: i % 2 === 1 }))
    .filter((part) => part.text);
}
