import { useState } from 'react';
import { AiDictTab } from './components/AiDictTab';
import { CollocationsTab } from './components/CollocationsTab';
import { WordClusterTab } from './components/WordClusterTab';

/** 词卡的三个 Tab，和 ReadingBook 的查词弹层一致 */
export type LookupTab = 'dict' | 'cluster' | 'collocations';

const TABS: readonly { value: LookupTab; label: string }[] = [
  { value: 'dict', label: 'AI 词典' },
  { value: 'cluster', label: '单词簇' },
  { value: 'collocations', label: '常见搭配' },
];

const NO_GENERATION: Record<LookupTab, number> = { dict: 0, cluster: 0, collocations: 0 };

type Props = {
  word: string;
  /** 单词所在的原句；单词模式下没有，语境释义在 5.3 接上来 */
  sentence?: string;
};

/**
 * 词卡（DEV_PLAN 5.3）：AI 词典 / 单词簇 / 常见搭配三个 Tab。
 * 每个 Tab 切过去才第一次请求，之后保持挂载，切回来不重新请求；
 * 重新生成按 Tab 各自计数，只让那个 Tab 跳过缓存。
 */
export function WordCard({ word, sentence = '' }: Props) {
  const [tab, setTab] = useState<LookupTab>('dict');
  const [opened, setOpened] = useState<readonly LookupTab[]>(['dict']);
  const [generations, setGenerations] = useState(NO_GENERATION);

  const changeTab = (next: LookupTab) => {
    setTab(next);
    setOpened((list) => (list.includes(next) ? list : [...list, next]));
  };
  const regenerate = (which: LookupTab) => () =>
    setGenerations((counts) => ({ ...counts, [which]: counts[which] + 1 }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        role="tablist"
        aria-label="词卡"
        className="grid grid-cols-3 gap-1 rounded-field bg-segment p-1"
      >
        {TABS.map(({ value, label }) => {
          const selected = value === tab;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => changeTab(value)}
              className={`rounded-[7px] py-1.5 text-callout ${
                selected
                  ? 'bg-surface font-medium text-ink shadow-segment'
                  : 'text-ink-body hover:text-ink'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {opened.map((key) => (
          <div key={key} hidden={key !== tab}>
            {key === 'dict' ? (
              <AiDictTab
                word={word}
                sentence={sentence}
                generation={generations.dict}
                onRefresh={regenerate('dict')}
              />
            ) : key === 'cluster' ? (
              <WordClusterTab
                word={word}
                sentence={sentence}
                generation={generations.cluster}
                onRefresh={regenerate('cluster')}
              />
            ) : (
              <CollocationsTab
                word={word}
                sentence={sentence}
                generation={generations.collocations}
                onRefresh={regenerate('collocations')}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
