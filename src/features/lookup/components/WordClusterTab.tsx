import type { ReactNode } from 'react';
import { AiFailed } from '../../../components/AiFailed';
import { RefreshChip } from '../../../components/RefreshChip';
import { SectionLabel } from '../../../components/SectionLabel';
import { CARD, SENSE } from '../../../components/styles';
import type { WordCluster, WordForm } from '../../../types/ai';
import { useAiWordResult } from '../hooks/useAiWordResult';
import { ExampleBlock } from './ExampleBlock';
import { ListSkeleton } from './ListSkeleton';

type Props = {
  word: string;
  sentence: string;
  generation: number;
  onRefresh: () => void;
};

/**
 * 单词簇 Tab（样张 04 第二个 Tab）：变形词、同根词 / 派生词、易混词，没有内容的组不显示。
 * 词只展示，不可点击（5.3）
 */
export function WordClusterTab({ word, sentence, generation, onRefresh }: Props) {
  const result = useAiWordResult('wordCluster', word, sentence, generation);

  if (result.status === 'error') {
    return <AiFailed message={result.message} onRetry={onRefresh} />;
  }
  if (result.status !== 'done') {
    return (
      <div>
        <SectionLabel title="单词簇" action={<RefreshChip onRefresh={onRefresh} loading />} />
        <ListSkeleton />
      </div>
    );
  }
  return <ClusterView query={word} cluster={result.data} onRefresh={onRefresh} />;
}

function ClusterView({
  query,
  cluster,
  onRefresh,
}: {
  query: string;
  cluster: WordCluster;
  onRefresh: () => void;
}) {
  const { forms, family, confusables } = cluster;
  // 「重新生成」挂在第一个有内容的组上（样子见样张）
  const chip = <RefreshChip onRefresh={onRefresh} loading={false} />;
  const first = forms.length > 0 ? 'forms' : family.length > 0 ? 'family' : 'confusables';

  return (
    <div className="flex flex-col gap-[18px]">
      {forms.length > 0 ? (
        <Group title="变形词" action={first === 'forms' ? chip : null}>
          <FormChips forms={forms} query={query} />
        </Group>
      ) : null}
      {family.length > 0 ? (
        <Group title="同根词 / 派生词" action={first === 'family' ? chip : null}>
          <div className={CARD.plain}>
            {family.map((item) => (
              <div key={item.word} className={SENSE}>
                <p>
                  <span className="text-body font-semibold text-ink">{item.word}</span>
                  {item.pos ? (
                    <span className="ml-2 text-callout font-bold text-primary italic">
                      {item.pos}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-footnote text-ink">{item.meaning}</p>
                <ExampleBlock
                  example={item.example}
                  translation={item.exampleTranslation}
                  terms={[item.word]}
                />
              </div>
            ))}
          </div>
        </Group>
      ) : null}
      {confusables.length > 0 ? (
        <Group title="易混词" action={first === 'confusables' ? chip : null}>
          <div className={CARD.plain}>
            {confusables.map((item) => (
              <div key={item.word} className={SENSE}>
                <p className="text-body font-semibold text-ink">{item.word}</p>
                <p className="mt-0.5 text-footnote text-ink">{item.meaning}</p>
                {item.difference ? (
                  <div className="mt-1.5 rounded-[10px] bg-soft px-2.5 py-1.5 text-footnote leading-[1.6] text-ink-body">
                    <b className="block text-[10px] tracking-[0.06em] text-ink-soft">区别</b>
                    {item.difference}
                  </div>
                ) : null}
                <ExampleBlock
                  example={item.example}
                  translation={item.exampleTranslation}
                  terms={[item.word]}
                />
              </div>
            ))}
          </div>
        </Group>
      ) : null}
    </div>
  );
}

/** 变形词小卡片（样张 .form）：上面是"过去式"等说明，下面是单词；用户查的那个形式橙底黑框 */
function FormChips({ forms, query }: { forms: WordForm[]; query: string }) {
  const current = query.trim().toLowerCase();

  return (
    <div className="flex flex-wrap gap-1.5">
      {forms.map((form) => {
        const selected = form.word.toLowerCase() === current;
        return (
          <div
            key={form.label}
            className={`flex min-w-[66px] flex-col gap-px rounded-[12px] px-2.5 py-[5px] ${
              selected
                ? 'border-2 border-ink bg-primary text-on-primary'
                : 'border border-line bg-surface text-ink'
            }`}
          >
            <small
              className={`text-[10px] font-bold tracking-[0.04em] ${
                selected ? 'text-on-primary opacity-85' : 'text-ink-soft'
              }`}
            >
              {form.label}
            </small>
            <span className="text-[13px] font-bold">{form.word}</span>
          </div>
        );
      })}
    </div>
  );
}

function Group({
  title,
  children,
  action = null,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div>
      <SectionLabel title={title} action={action} />
      {children}
    </div>
  );
}
