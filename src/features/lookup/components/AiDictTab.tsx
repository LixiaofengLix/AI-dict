import { Skeleton } from '../../../components/Skeleton';
import type { AiDictEntry } from '../../../types/ai';
import { useAiWordResult } from '../hooks/useAiWordResult';
import { AiDictSenses } from './AiDictSenses';
import { AiFailed } from './AiFailed';
import { PhoneticPill } from './PhoneticPill';
import { TabToolbar } from './TabToolbar';

type Props = {
  word: string;
  /** 原句，单词模式下为空字符串；只用来帮 AI 判断原形和词性 */
  sentence: string;
  generation: number;
  onRefresh: () => void;
};

/** AI 词典 Tab：原形、音标、考试标签，下面是词典式的中英释义 */
export function AiDictTab({ word, sentence, generation, onRefresh }: Props) {
  const result = useAiWordResult('aiDictionary', word, sentence, generation);

  return (
    <div>
      <TabToolbar onRefresh={onRefresh} loading={result.status === 'loading'} />
      {result.status === 'done' ? (
        <EntryView query={word} entry={result.data} />
      ) : result.status === 'error' ? (
        <AiFailed message={result.message} onRetry={onRefresh} />
      ) : (
        <EntrySkeleton />
      )}
    </div>
  );
}

function EntryView({ query, entry }: { query: string; entry: AiDictEntry }) {
  // 查的是变形（went）时说明它对应哪个原形，不区分大小写
  const inflected = query.toLowerCase() !== entry.word.toLowerCase();

  return (
    <div className="px-1">
      <p className="text-title font-semibold text-ink">{entry.word}</p>
      {inflected ? (
        <p className="mt-0.5 text-footnote text-ink-soft">
          {query} 是 {entry.word} 的变形
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <PhoneticPill word={entry.word} phonetic={entry.phonetic} />
        {entry.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-line px-2.5 py-0.5 text-caption text-ink-soft"
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="mt-6 mb-3 text-caption font-medium tracking-wide text-ink-faint">释义</p>
      <AiDictSenses senses={entry.senses} />
    </div>
  );
}

function EntrySkeleton() {
  return (
    <div className="flex flex-col gap-3 px-1">
      <Skeleton width="45%" height={26} />
      <Skeleton width={140} height={32} className="rounded-full" />
      <div className="mt-4 flex flex-col gap-3">
        <Skeleton width="40%" />
        <Skeleton />
        <Skeleton width="80%" />
      </div>
    </div>
  );
}
