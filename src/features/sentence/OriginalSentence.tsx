import { useMemo, useState } from 'react';
import { EditBox } from '../../components/EditBox';
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
  /** 双击整个框进入编辑，改完回车把新文字交出去 */
  onEdit?: (text: string) => void;
  /** 刚进入编辑时调一下：双击的第一下会点中一个词，外面借这个把词卡收起来 */
  onEditStart?: () => void;
};

const SENTENCE_TEXT = 'text-[14.5px] leading-[1.75] font-medium break-words text-ink';

/**
 * 原句（5.2，样张 .card.soft + .sentence）：每个词单独渲染成可点的按钮，带虚线下划线，
 * 点了的词青绿淡底；标点、空格是普通文字，排版和原文一样（分词只是把词包进按钮里，不改字）。
 * 双击框进入编辑：取词取多了、少了，或者想换个说法，直接在这里改。
 */
export function OriginalSentence({
  text,
  selectedIndex = null,
  onWordClick,
  onEdit,
  onEditStart,
}: Props) {
  const parts = useMemo(() => (onWordClick ? splitWords(text) : []), [text, onWordClick]);
  const [editing, setEditing] = useState(false);

  if (editing && onEdit) {
    return (
      <EditBox
        initial={text}
        onCommit={(next) => {
          setEditing(false);
          onEdit(next);
        }}
        onCancel={() => setEditing(false)}
        className={`max-h-40 shrink-0 rounded-inner border border-ink bg-soft px-3 py-2.5 whitespace-pre-wrap ${SENTENCE_TEXT}`}
      />
    );
  }

  return (
    <div
      title={onEdit ? '双击修改' : undefined}
      // 双击时别让系统顺手选中一个词
      onMouseDown={(event) => {
        if (onEdit && event.detail > 1) event.preventDefault();
      }}
      onDoubleClick={
        onEdit
          ? () => {
              onEditStart?.();
              setEditing(true);
            }
          : undefined
      }
      className={`scroll-thin max-h-40 shrink-0 overflow-y-auto ${CARD.soft}`}
    >
      <p className={`whitespace-pre-wrap ${SENTENCE_TEXT}`}>
        {onWordClick
          ? parts.map((part, index) =>
              part.kind === 'word' ? (
                <button
                  key={index}
                  type="button"
                  // 双击的第二下不算点词，不然刚点开的词卡又被收回去
                  onClick={(event) => {
                    if (event.detail <= 1) onWordClick(part.text, part.sentence, index);
                  }}
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
