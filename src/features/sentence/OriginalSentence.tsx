import { useMemo } from 'react';
import { CARD } from '../../components/styles';
import { splitWords } from './splitWords';

type Props = {
  text: string;
  /** 当前点的那个词在分词结果里的下标；给另一段就取消上一个的高亮 */
  selectedIndex?: number | null;
  /**
   * 点词回调：给出这个词和它所在的句子。不传就整段按纯文字显示——
   * 中文输入不做句中取词（5.1），没有可点的词。
   */
  onWordClick?: (word: string, sentence: string, index: number) => void;
};

/**
 * 原句（5.2，样张 .card.soft + .sentence）：每个词单独渲染成可点的按钮，带虚线下划线，
 * 点了的词青绿淡底；标点、空格是普通文字，排版和原文一样（分词只是把词包进按钮里，不改字）。
 */
export function OriginalSentence({ text, selectedIndex = null, onWordClick }: Props) {
  const parts = useMemo(() => (onWordClick ? splitWords(text) : []), [text, onWordClick]);

  return (
    <div className={`scroll-thin max-h-40 shrink-0 overflow-y-auto ${CARD.soft}`}>
      <p className="text-[14.5px] leading-[1.75] font-medium break-words whitespace-pre-wrap text-ink">
        {onWordClick
          ? parts.map((part, index) =>
              part.kind === 'word' ? (
                <button
                  key={index}
                  type="button"
                  onClick={() => onWordClick(part.text, part.sentence, index)}
                  title={index === selectedIndex ? '再点一次回到译文' : undefined}
                  className={`border-b-2 border-dotted pb-px ${
                    index === selectedIndex
                      ? 'rounded-[4px] border-mint bg-mint-soft px-1 py-px'
                      : 'border-underline hover:border-ink-soft'
                  }`}
                >
                  {part.text}
                </button>
              ) : (
                <span key={index}>{part.text}</span>
              ),
            )
          : text}
      </p>
    </div>
  );
}
