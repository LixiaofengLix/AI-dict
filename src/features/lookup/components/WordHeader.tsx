import type { AiDictEntry } from '../../../types/ai';
import type { AiResult } from '../hooks/useAiWordResult';
import { PhoneticPill } from './PhoneticPill';

type Props = {
  /** 点的那个词（原句里的形式，如 went） */
  query: string;
  /** AI 词典结果：原形、音标从这来（6.1 起点词就请求，见 DEV_PLAN 第 3 节） */
  result: AiResult<AiDictEntry>;
};

/** 词头：原形（点是变形时显示 went → go）、音标 + 发音；收藏星标由外面拼在这行尾 */
export function WordHeader({ query, result }: Props) {
  if (result.status !== 'done') {
    // 词典没好时先显示点的那个词，星标那边会是禁用状态
    return <p className="min-w-0 flex-1 truncate text-title font-semibold text-ink">{query}</p>;
  }

  const entry = result.data;
  // 查的是变形（went）时说明它对应哪个原形，不区分大小写
  const inflected = query.toLowerCase() !== entry.word.toLowerCase();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <p className="min-w-0 truncate text-title font-semibold text-ink">
        {inflected ? (
          <>
            <span className="font-normal text-ink-soft">{query}</span> → {entry.word}
          </>
        ) : (
          entry.word
        )}
      </p>
      <PhoneticPill word={entry.word} phonetic={entry.phonetic} />
    </div>
  );
}
