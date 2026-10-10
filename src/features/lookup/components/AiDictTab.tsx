import { AiFailed } from '../../../components/AiFailed';
import { RefreshChip } from '../../../components/RefreshChip';
import { SectionLabel } from '../../../components/SectionLabel';
import { Skeleton } from '../../../components/Skeleton';
import { CARD } from '../../../components/styles';
import type { AiDictEntry } from '../../../types/ai';
import type { AiResult } from '../hooks/useAiWordResult';
import { AiDictSenses } from './AiDictSenses';

type Props = {
  /** 点的那个词，例句里加粗用 */
  query: string;
  /** AI 词典的结果，由词卡顶层请求（词头和收藏星标也要用，见 6.1） */
  result: AiResult<AiDictEntry>;
  onRefresh: () => void;
};

/** AI 词典 Tab（样张 04 / 05）：词典式的中英释义；原形、音标、发音在词头里 */
export function AiDictTab({ query, result, onRefresh }: Props) {
  if (result.status === 'error') {
    return <AiFailed message={result.message} onRetry={onRefresh} />;
  }

  const loading = result.status !== 'done';
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <SectionLabel
          title="AI 词典"
          action={<RefreshChip onRefresh={onRefresh} loading={loading} />}
        />
        {loading ? (
          <EntrySkeleton />
        ) : (
          <div className={CARD.plain}>
            <AiDictSenses senses={result.data.senses} terms={[query, result.data.word]} />
          </div>
        )}
      </div>
    </div>
  );
}

/** 骨架屏（样张 05）：三组长短不一的条 */
function EntrySkeleton() {
  const groups = [
    ['38%', '100%', '78%'],
    ['32%', '100%', '66%'],
    ['42%', '88%'],
  ];
  return (
    <div className={`flex flex-col gap-[22px] ${CARD.plain}`}>
      {groups.map((widths, i) => (
        <div key={i} className="flex flex-col gap-2">
          {widths.map((width, j) => (
            <Skeleton key={j} width={width} />
          ))}
        </div>
      ))}
    </div>
  );
}
