import { AiFailed } from '../../../components/AiFailed';
import { RefreshChip } from '../../../components/RefreshChip';
import { SectionLabel } from '../../../components/SectionLabel';
import { CAPTION, CARD, SENSE } from '../../../components/styles';
import { useAiWordResult } from '../hooks/useAiWordResult';
import { ExampleBlock } from './ExampleBlock';
import { ListSkeleton } from './ListSkeleton';

type Props = {
  word: string;
  sentence: string;
  generation: number;
  onRefresh: () => void;
};

/** 常见搭配 Tab（样张 04 第三个 Tab）：搭配、中文释义、例句 + 翻译 */
export function CollocationsTab({ word, sentence, generation, onRefresh }: Props) {
  const result = useAiWordResult('collocations', word, sentence, generation);

  if (result.status === 'error') {
    return <AiFailed message={result.message} onRetry={onRefresh} />;
  }

  const loading = result.status !== 'done';
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <SectionLabel
          title="常见搭配"
          action={<RefreshChip onRefresh={onRefresh} loading={loading} />}
        />
        {loading ? (
          <ListSkeleton />
        ) : result.data.length === 0 ? (
          <p className={`py-8 text-center ${CAPTION}`}>这个词没有常见搭配</p>
        ) : (
          <div className={CARD.plain}>
            {result.data.map((item) => (
              <div key={item.phrase} className={SENSE}>
                <p className="text-body font-semibold text-ink">{item.phrase}</p>
                <p className="mt-0.5 text-footnote text-ink">{item.meaning}</p>
                <ExampleBlock
                  example={item.example}
                  translation={item.exampleTranslation}
                  terms={[item.phrase, word]}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
