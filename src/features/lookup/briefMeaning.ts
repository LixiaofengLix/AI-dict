import type { AiDictEntry } from '../../types/ai';

const MAX_SENSES = 3;

/** 生词本列表里的简要释义：取前几条，相邻同词性合并，如 "v. 去；走；离开  n. 尝试" */
export function briefMeaning(entry: AiDictEntry): string {
  const groups: { pos: string; meanings: string[] }[] = [];
  for (const sense of entry.senses.slice(0, MAX_SENSES)) {
    const last = groups.at(-1);
    if (last && last.pos === sense.pos) {
      last.meanings.push(sense.meaning);
    } else {
      groups.push({ pos: sense.pos, meanings: [sense.meaning] });
    }
  }
  return groups
    .map(({ pos, meanings }) => [pos, meanings.join('；')].filter(Boolean).join(' '))
    .join('  ');
}
