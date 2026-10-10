import { useState } from 'react';
import { SENSE } from '../../../components/styles';
import type { AiDictSense } from '../../../types/ai';
import { ExampleBlock } from './ExampleBlock';

/** 超过这个条数时折叠，点"展开"看全部 */
const COLLAPSED_COUNT = 4;

/**
 * 逐条释义（样张 .sense）：第一行词性 + 中文，第二行英文释义，下面是例句和翻译。
 * 生词详情里不带例句（样张 11）。
 */
export function AiDictSenses({
  senses,
  terms = [],
  examples = true,
}: {
  senses: AiDictSense[];
  /** 例句里要加粗的词 */
  terms?: readonly string[];
  examples?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = senses.length > COLLAPSED_COUNT;
  const shown = collapsible && !expanded ? senses.slice(0, COLLAPSED_COUNT) : senses;

  return (
    <div>
      {shown.map((sense, i) => (
        <div key={i} className={SENSE}>
          <p>
            {sense.pos ? (
              <span className="mr-1 text-callout font-bold text-primary italic">{sense.pos}</span>
            ) : null}
            <span className="text-body font-semibold text-ink">{sense.meaning}</span>
          </p>
          {sense.definition ? (
            <p className="mt-0.5 text-footnote text-ink-body">{sense.definition}</p>
          ) : null}
          {examples ? (
            <ExampleBlock
              example={sense.example}
              translation={sense.exampleTranslation}
              terms={terms}
            />
          ) : null}
        </div>
      ))}
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-1.5 pt-2 text-footnote font-semibold text-ink-body hover:text-ink"
        >
          {expanded ? '收起 ⌃' : `展开全部 ${senses.length} 条释义 ⌄`}
        </button>
      ) : null}
    </div>
  );
}
