import { useState, type ReactNode } from 'react';
import { Segment } from '../../components/Segment';
import { SCROLL_AREA } from '../../components/styles';
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
  /** 词头那一行（返回译文 / 原形 / 音标 / 星标），放在分段控件下面 */
  header: ReactNode;
  /** 语境释义卡片，放在分段控件上面；单词模式没有 */
  context?: ReactNode;
};

/**
 * 词卡的三个 Tab：AI 词典 / 单词簇 / 常见搭配。
 * 顺序照样张：句子模式是「语境释义 → 分段控件 → 词头 → Tab 内容」整块一起滚（02），
 * 单词模式是分段控件和词头固定、只有 Tab 内容滚（04）。
 * 单词簇、常见搭配切过去才第一次请求，之后保持挂载，切回来不重新请求；
 * 重新生成按 Tab 各自计数，只让那个 Tab 跳过缓存。
 */
export function WordCard({ word, sentence = '', dict, onRefreshDict, header, context }: Props) {
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

  const segment = (
    <Segment options={TABS} value={tab} onChange={changeTab} label="词卡" role="tab" />
  );
  const panes = opened.map((key) => (
    <div key={key} hidden={key !== tab} className="flex flex-1 flex-col">
      {key === 'dict' ? (
        <AiDictTab query={word} result={dict} onRefresh={onRefreshDict} />
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
  ));

  if (context) {
    return (
      <div className={SCROLL_AREA}>
        {context}
        {segment}
        {header}
        {panes}
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {segment}
      {header}
      <div className={SCROLL_AREA}>{panes}</div>
    </div>
  );
}
