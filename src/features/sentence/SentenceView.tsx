import { useState } from 'react';
import { AiFailed } from '../../components/AiFailed';
import { Skeleton } from '../../components/Skeleton';
import { TabToolbar } from '../../components/TabToolbar';
import { TRANSLATION_HEADINGS, translateDirection } from '../../services/ai/prompts/translate';
import { usePassageAi } from './hooks/usePassageAi';
import { OriginalSentence } from './OriginalSentence';
import { type Block, parseSections, splitBold } from './parseSections';

/**
 * 句子模式（DEV_PLAN 5.1/5.2）：原句 + 中文翻译 + 句意解释，流式显示。
 * 中文输入走中译英，两节的标题跟着换成"英文翻译"（见 prompts/translate）。
 * 原句里的词可点（5.2），点中的高亮；点词出词卡是 5.3。
 */
export function SentenceView({ text }: { text: string }) {
  const [generation, setGeneration] = useState(0);
  // 点的那个词和它所在的句子：5.2 只用来高亮，5.3 的词卡拿它当语境
  const [picked, setPicked] = useState<{ word: string; sentence: string; index: number } | null>(
    null,
  );
  const result = usePassageAi(text, generation);
  const direction = translateDirection(text);
  const headings = TRANSLATION_HEADINGS[direction];
  const sections = parseSections(result.text ?? '', headings);
  const translation = sections[headings[0]];
  const explanation = sections[headings[1]];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <TabToolbar onRefresh={() => setGeneration((count) => count + 1)} loading={!result.done} />
      <div className="flex flex-col gap-3">
        {/* 选中的原文：界面的主语，翻译和解释都在讲它 */}
        <OriginalSentence
          text={text}
          selectedIndex={picked?.index ?? null}
          // 中文输入只整句翻译，不做句中取词（5.1）：不传回调就是纯文字
          onWordClick={
            direction === 'toChinese'
              ? (word, sentence, index) => setPicked({ word, sentence, index })
              : undefined
          }
        />
        <Section title={headings[0]} blocks={translation} />
        {/* 输出结束（包括失败）仍没有这一节时不显示空卡片 */}
        {explanation !== null || !result.done ? (
          <Section title={headings[1]} blocks={explanation} muted />
        ) : null}
        {result.error ? <AiFailed message={result.error} onRetry={result.retry} /> : null}
      </div>
    </div>
  );
}

/** 一节 AI 输出：标题 + 卡片；blocks 为 null 表示这一节还没开始输出，显示骨架 */
function Section({
  title,
  blocks,
  muted = false,
}: {
  title: string;
  blocks: Block[] | null;
  /** 次要内容（句意解释）：字小一号、颜色浅一档 */
  muted?: boolean;
}) {
  return (
    <section>
      <p className="mb-1.5 px-0.5 text-caption font-medium tracking-wide text-ink-faint">{title}</p>
      <div className="rounded-card border border-line bg-surface px-3 py-2.5">
        {blocks ? (
          <div className="flex flex-col gap-1.5">
            {blocks.map((block, index) => (
              <Line key={index} block={block} muted={muted} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-0.5">
            <Skeleton width="92%" />
            <Skeleton width="70%" />
          </div>
        )}
      </div>
    </section>
  );
}

/** 一行输出：段落或列表项，"**加粗**"用粗体显示 */
function Line({ block, muted }: { block: Block; muted: boolean }) {
  const textClass = muted ? 'text-callout text-ink-body' : 'text-body text-ink';
  const content = splitBold(block.text).map((part, index) =>
    part.bold ? (
      <span key={index} className="font-medium text-ink">
        {part.text}
      </span>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );

  if (!block.bullet) {
    return <p className={`leading-relaxed break-words ${textClass}`}>{content}</p>;
  }
  return (
    <div className="flex gap-2">
      <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <p className={`min-w-0 flex-1 leading-relaxed break-words ${textClass}`}>{content}</p>
    </div>
  );
}
