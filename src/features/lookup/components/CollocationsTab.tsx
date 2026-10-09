import { AiFailed } from '../../../components/AiFailed';
import { TabToolbar } from '../../../components/TabToolbar';
import type { Collocation } from '../../../types/ai';
import { useAiWordResult } from '../hooks/useAiWordResult';
import { ExampleBlock } from './ExampleBlock';
import { ListSkeleton } from './ListSkeleton';

type Props = {
  word: string;
  sentence: string;
  generation: number;
  onRefresh: () => void;
};

/** 常见搭配 Tab：搭配、中文释义、例句 + 翻译 */
export function CollocationsTab({ word, sentence, generation, onRefresh }: Props) {
  const result = useAiWordResult('collocations', word, sentence, generation);

  return (
    <div>
      <TabToolbar onRefresh={onRefresh} loading={result.status === 'loading'} />
      {result.status === 'done' ? (
        <CollocationList items={result.data} />
      ) : result.status === 'error' ? (
        <AiFailed message={result.message} onRetry={onRefresh} />
      ) : (
        <ListSkeleton />
      )}
    </div>
  );
}

function CollocationList({ items }: { items: Collocation[] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-callout text-ink-soft">这个词没有常见搭配</p>;
  }

  return (
    <div className="px-1">
      {items.map((item, i) => (
        <div
          key={item.phrase}
          className={`flex flex-col gap-0.5 py-2.5 ${i > 0 ? 'border-t border-line' : ''}`}
        >
          <p className="text-body font-medium text-ink">{item.phrase}</p>
          <p className="text-body text-ink">{item.meaning}</p>
          <ExampleBlock example={item.example} translation={item.exampleTranslation} />
        </div>
      ))}
    </div>
  );
}
