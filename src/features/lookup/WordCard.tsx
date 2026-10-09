import { useState } from 'react';
import type { AiDictEntry } from '../../types/ai';
import { AiDictTab } from './components/AiDictTab';
import { CollocationsTab } from './components/CollocationsTab';
import { WordClusterTab } from './components/WordClusterTab';
import type { AiResult } from './hooks/useAiWordResult';

/** 词卡的三个 Tab，和 ReadingBook 的查词弹层一致 */
export type LookupTab = 'dict' | 'cluster' | 'collocations';

const TABS: readonly { value: LookupTab; label: string }[] = [
  { value: 'dict', label: 'AI 词典' },
  { value: 'cluster', label: '单词簇' },
  { value: 'collocations', label: '常见搭配' },
];

type Props = {
  word: string;
  /** 单词所在的原句；单词模式下为空字符串 */
  sentence?: string;
  /** AI 词典的结果和重新生成：请求在词卡顶层（词头和收藏星标也要用，6.1），这里只管展示 */
  dict: AiResult<AiDictEntry>;
  onRefreshDict: () => void;
};

/**
 * 词卡的三个 Tab（DEV_PLAN 5.3）：AI 词典 / 单词簇 / 常见搭配。
 * 单词簇、常见搭配切过去才第一次请求，之后保持挂载，切回来不重新请求；
 * 重新生成按 Tab 各自计数，只让那个 Tab 跳过缓存。
 */
export function WordCard({ word, sentence = '', dict, onRefreshDict }: Props) {
  const [tab, setTab] = useState<LookupTab>('dict');
  const [opened, setOpened] = useState<readonly LookupTab[]>(['dict']);
  // 词典的重新生成在词卡顶层（generation 在 WordPanel 里），这里只记另外两个
  const [generations, setGenerations] = useState({ cluster: 0, collocations: 0 });

  const changeTab = (next: LookupTab) => {
    setTab(next);
    setOpened((list) => (list.includes(next) ? list : [...list, next]));
  };
  const regenerate = (which: keyof typeof generations) => () =>
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
              <AiDictTab result={dict} onRefresh={onRefreshDict} />
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
