import { useState, type ReactNode } from 'react';
import { AiFailed } from '../../components/AiFailed';
import { Caret } from '../../components/Caret';
import { RefreshChip } from '../../components/RefreshChip';
import { SectionLabel } from '../../components/SectionLabel';
import { Skeleton } from '../../components/Skeleton';
import { CARD, SCROLL_AREA, tagClass } from '../../components/styles';
import { TRANSLATION_HEADINGS, translateDirection } from '../../services/ai/prompts/translate';
import { WordPanel } from '../lookup/WordPanel';
import { usePassageAi } from './hooks/usePassageAi';
import { OriginalSentence } from './OriginalSentence';
import { type Block, parseSections, splitBold } from './parseSections';

/**
 * 句子模式（DEV_PLAN 5.1~5.3，样张 01~03）：原句（词可点）+ 译文，点词后译文区换成词卡。
 * 英译中只有中文翻译；中文输入走中译英，是英文翻译 + 句意解释（讲选词），词也不可点。
 */
export function SentenceView({ text }: { text: string }) {
  const [generation, setGeneration] = useState(0);
  // 点的那个词、它所在的句子和它在原句里的位置（只有它高亮，同词的另一处不高亮）
  const [picked, setPicked] = useState<{ word: string; sentence: string; index: number } | null>(
    null,
  );
  const result = usePassageAi(text, generation);
  const direction = translateDirection(text);
  // 英译中只有译文一节，中译英还有一节句意解释（见 prompts/translate）
  const [translationTitle, explanationTitle]: readonly string[] = TRANSLATION_HEADINGS[direction];
  const sections: Record<string, Block[] | null> = parseSections(
    result.text ?? '',
    TRANSLATION_HEADINGS[direction],
  );
  const translation = sections[translationTitle];
  const explanation = explanationTitle ? sections[explanationTitle] : null;
  // 词卡里语境释义下面那行「译文：…」用纯文字
  const plainTranslation = (translation ?? [])
    .map((block) =>
      splitBold(block.text)
        .map((part) => part.text)
        .join(''),
    )
    .join(' ');

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      {/* 原句始终可见（5.2 规则 1）：点完词还能接着点别的；一段话太长时它自己滚 */}
      <OriginalSentence
        text={text}
        selectedIndex={picked?.index ?? null}
        // 中文输入只整句翻译，不做句中取词（5.1）：不传回调就是纯文字
        onWordClick={
          direction === 'toChinese'
            ? (word, sentence, index) =>
                // 再点一次高亮的那个词就回到译文（样张里词卡没有返回按钮）
                setPicked(index === picked?.index ? null : { word, sentence, index })
            : undefined
        }
      />
      {direction === 'toEnglish' ? (
        <div className="flex shrink-0 gap-2">
          <span className={tagClass('dark')}>中译英</span>
          <span className={tagClass()}>原句不可点</span>
        </div>
      ) : null}

      {/* 译文不卸载、只是藏起来：点词时还在流式的输出不白跑，返回译文接着看 */}
      <div hidden={picked !== null} className={SCROLL_AREA}>
        <Section
          title={translationTitle}
          blocks={translation}
          streaming={!result.done}
          action={
            <RefreshChip
              onRefresh={() => setGeneration((count) => count + 1)}
              loading={!result.done}
            />
          }
        />
        {/* 输出结束（包括失败）仍没有这一节时不显示空卡片 */}
        {explanationTitle && (explanation !== null || !result.done) ? (
          <Section title={explanationTitle} blocks={explanation} muted />
        ) : null}
        {result.error ? <AiFailed message={result.error} onRetry={result.retry} /> : null}
      </div>

      {/* 换词整块重挂载：上一个词还在跑的请求跟着取消（5.2 规则 1） */}
      {picked ? (
        <WordPanel
          key={picked.word}
          word={picked.word}
          sentence={picked.sentence}
          translation={plainTranslation}
        />
      ) : null}
    </div>
  );
}

/**
 * 一节 AI 输出：标题 + 卡片。译文是黑底白字卡（样张 01、03），句意解释是浅描边的次要卡。
 * blocks 为 null 表示这一节还没开始输出：译文卡只亮一个光标，句意解释显示骨架。
 */
function Section({
  title,
  blocks,
  muted = false,
  streaming = false,
  action = null,
}: {
  title: string;
  blocks: Block[] | null;
  /** 次要内容（句意解释）：字小一号、颜色浅一档 */
  muted?: boolean;
  /** 还在流式输出：最后一行后面跟着光标 */
  streaming?: boolean;
  /** 右对齐的小工具（「重新生成」），只有第一节有 */
  action?: ReactNode;
}) {
  return (
    <section>
      <SectionLabel title={title} muted={muted} action={action} />
      <div className={muted ? CARD.quiet : CARD.dark}>
        {blocks ? (
          <div className="flex flex-col gap-1.5">
            {blocks.map((block, index) => (
              <Line
                key={index}
                block={block}
                muted={muted}
                caret={streaming && index === blocks.length - 1}
              />
            ))}
          </div>
        ) : muted ? (
          <div className="flex flex-col gap-2 py-0.5">
            <Skeleton width="92%" />
            <Skeleton width="70%" />
          </div>
        ) : (
          <p className="text-body leading-[1.65]">{streaming ? <Caret /> : null}</p>
        )}
      </div>
    </section>
  );
}

/** 一行输出：段落或列表项，"**加粗**"用粗体显示 */
function Line({ block, muted, caret }: { block: Block; muted: boolean; caret: boolean }) {
  const textClass = muted ? 'text-callout text-ink-body' : 'text-body';
  const content = splitBold(block.text).map((part, index) =>
    part.bold ? (
      <b key={index} className={`font-bold ${muted ? 'text-ink' : ''}`}>
        {part.text}
      </b>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );

  const body = (
    <>
      {content}
      {caret ? <Caret /> : null}
    </>
  );
  if (!block.bullet && !muted) {
    return <p className={`leading-[1.65] break-words ${textClass}`}>{body}</p>;
  }
  return (
    <div className="flex gap-[9px]">
      <span
        aria-hidden
        className={`mt-[0.72em] h-1.5 w-1.5 shrink-0 ${muted ? 'bg-ink' : 'bg-surface'}`}
      />
      <p className={`min-w-0 flex-1 leading-[1.65] break-words ${textClass}`}>{body}</p>
    </div>
  );
}
