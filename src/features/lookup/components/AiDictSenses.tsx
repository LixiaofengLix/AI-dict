import { useState } from 'react';
import type { AiDictSense } from '../../../types/ai';
import { ExampleBlock } from './ExampleBlock';

/** 超过这个条数时折叠，点"展开"看全部 */
const COLLAPSED_COUNT = 4;

/** 逐条释义：第一行词性 + 中文，第二行对应的英文释义，下面是例句和翻译 */
export function AiDictSenses({ senses }: { senses: AiDictSense[] }) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = senses.length > COLLAPSED_COUNT;
  const shown = collapsible && !expanded ? senses.slice(0, COLLAPSED_COUNT) : senses;

  return (
    <div className="flex flex-col gap-4">
      {shown.map((sense, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          <p className="text-body text-ink">
            {sense.pos ? (
              <span className="mr-1 text-callout text-primary italic">{sense.pos}</span>
            ) : null}
            {sense.meaning}
          </p>
          {sense.definition ? (
            <p className="text-callout text-ink-soft">{sense.definition}</p>
          ) : null}
          <ExampleBlock example={sense.example} translation={sense.exampleTranslation} />
        </div>
      ))}
      {collapsible ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex items-center gap-1 self-start text-footnote text-ink-soft hover:text-ink"
        >
          {expanded ? '收起' : `展开全部 ${senses.length} 条释义`}
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3.5 w-3.5 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
