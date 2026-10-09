import { AiFailed } from '../../../components/AiFailed';
import { Skeleton } from '../../../components/Skeleton';
import { TabToolbar } from '../../../components/TabToolbar';
import type { AiDictEntry } from '../../../types/ai';
import type { AiResult } from '../hooks/useAiWordResult';
import { AiDictSenses } from './AiDictSenses';

type Props = {
  /** AI 词典的结果，由词卡顶层请求（词头和收藏星标也要用，见 6.1） */
  result: AiResult<AiDictEntry>;
  onRefresh: () => void;
};

/** AI 词典 Tab：考试标签 + 词典式的中英释义；原形、音标、发音在词头里 */
export function AiDictTab({ result, onRefresh }: Props) {
  return (
    <div>
      <TabToolbar onRefresh={onRefresh} loading={result.status === 'loading'} />
      {result.status === 'done' ? (
        <EntryView entry={result.data} />
      ) : result.status === 'error' ? (
        <AiFailed message={result.message} onRetry={onRefresh} />
      ) : (
        <EntrySkeleton />
      )}
    </div>
  );
}

function EntryView({ entry }: { entry: AiDictEntry }) {
  return (
    <div className="px-1">
      {entry.tags.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-line px-2.5 py-0.5 text-caption text-ink-soft"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mb-3 text-caption font-medium tracking-wide text-ink-faint">释义</p>
      <AiDictSenses senses={entry.senses} />
    </div>
  );
}

function EntrySkeleton() {
  return (
    <div className="flex flex-col gap-3 px-1">
      <Skeleton width={140} height={24} className="rounded-full" />
      <div className="mt-1 flex flex-col gap-3">
        <Skeleton width="40%" />
        <Skeleton />
        <Skeleton width="80%" />
      </div>
    </div>
  );
}
