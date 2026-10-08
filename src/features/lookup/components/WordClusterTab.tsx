import type { ReactNode } from 'react';
import type { WordCluster, WordForm } from '../../../types/ai';
import { useAiWordResult } from '../hooks/useAiWordResult';
import { AiFailed } from './AiFailed';
import { ExampleBlock } from './ExampleBlock';
import { ListSkeleton } from './ListSkeleton';
import { TabToolbar } from './TabToolbar';

type Props = {
  word: string;
  sentence: string;
  generation: number;
  onRefresh: () => void;
};

/** 单词簇 Tab：变形词、同根词 / 派生词、易混词，没有内容的组不显示。词只展示，不可点击（5.3） */
export function WordClusterTab({ word, sentence, generation, onRefresh }: Props) {
  const result = useAiWordResult('wordCluster', word, sentence, generation);

  return (
    <div>
      <TabToolbar onRefresh={onRefresh} loading={result.status === 'loading'} />
      {result.status === 'done' ? (
        <ClusterView query={word} cluster={result.data} />
      ) : result.status === 'error' ? (
        <AiFailed message={result.message} onRetry={onRefresh} />
      ) : (
        <ListSkeleton />
      )}
    </div>
  );
}

function ClusterView({ query, cluster }: { query: string; cluster: WordCluster }) {
  const { forms, family, confusables } = cluster;

  return (
    <div className="flex flex-col gap-7 px-1">
      {forms.length > 0 ? (
        <Section title="变形词">
          <FormChips forms={forms} query={query} />
        </Section>
      ) : null}
      {family.length > 0 ? (
        <Section title="同根词 / 派生词">
          {family.map((item, i) => (
            <div key={item.word} className={itemClass(i)}>
              <WordHeading word={item.word} pos={item.pos} />
              <p className="text-body text-ink">{item.meaning}</p>
              <ExampleBlock example={item.example} translation={item.exampleTranslation} />
            </div>
          ))}
        </Section>
      ) : null}
      {confusables.length > 0 ? (
        <Section title="易混词">
          {confusables.map((item, i) => (
            <div key={item.word} className={itemClass(i)}>
              <WordHeading word={item.word} />
              <p className="text-body text-ink">{item.meaning}</p>
              {item.difference ? (
                <div className="mt-1.5 rounded-field bg-page px-2.5 py-1.5">
                  <p className="text-caption text-ink-faint">区别</p>
                  <p className="text-footnote text-ink-body">{item.difference}</p>
                </div>
              ) : null}
              <ExampleBlock example={item.example} translation={item.exampleTranslation} />
            </div>
          ))}
        </Section>
      ) : null}
    </div>
  );
}

/** 列表项之间用一条细线分隔，第一项不用 */
const itemClass = (index: number) =>
  `flex flex-col gap-0.5 py-2.5 ${index > 0 ? 'border-t border-line' : ''}`;

/** 单词 + 词性（斜体小字） */
function WordHeading({ word, pos }: { word: string; pos?: string }) {
  return (
    <p className="text-body font-medium text-ink">
      {word}
      {pos ? <span className="ml-2 text-footnote text-primary italic">{pos}</span> : null}
    </p>
  );
}

/** 变形词小卡片：上面是"过去式"等说明，下面是单词；用户查的那个形式高亮 */
function FormChips({ forms, query }: { forms: WordForm[]; query: string }) {
  const current = query.trim().toLowerCase();

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {forms.map((form) => {
        const selected = form.word.toLowerCase() === current;
        return (
          <div
            key={form.label}
            className={`flex min-w-19 flex-col gap-0.5 rounded-field border px-3 py-1.5 ${
              selected ? 'border-primary bg-primary text-on-primary' : 'border-line'
            }`}
          >
            <span className={`text-caption ${selected ? 'text-on-primary' : 'text-ink-faint'}`}>
              {form.label}
            </span>
            <span className={`text-body font-medium ${selected ? 'text-on-primary' : 'text-ink'}`}>
              {form.word}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-caption font-medium tracking-wide text-ink-faint">{title}</p>
      {children}
    </div>
  );
}
