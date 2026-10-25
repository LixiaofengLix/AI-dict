import { useState, type MouseEvent } from 'react';
import { EditBox } from '../../../components/EditBox';
import { wordTitleClass } from '../../../components/styles';
import type { AiDictEntry } from '../../../types/ai';
import type { AiResult } from '../hooks/useAiWordResult';
import { PhoneticPill } from './PhoneticPill';

type Props = {
  /** 点的那个词（原句里的形式，如 went） */
  query: string;
  /** AI 词典结果：原形、音标从这来（点词时就并行请求） */
  result: AiResult<AiDictEntry>;
  /** 句子模式和生词详情里小一号（样张 02、11 是 20px，单词模式 22px） */
  compact?: boolean;
  /** 单词模式才有：双击词进入编辑，改完回车把新文字交出去 */
  onEdit?: (text: string) => void;
};

/** 词头：原形（点是变形时显示 went → go）、音标 + 发音；收藏星标由外面拼在这行尾 */
export function WordHeader({ query, result, compact = false, onEdit }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing && onEdit) {
    return (
      <EditBox
        initial={query}
        onCommit={(next) => {
          setEditing(false);
          onEdit(next);
        }}
        onCancel={() => setEditing(false)}
        className={`min-w-24 max-w-full rounded-inner border border-ink bg-soft px-2 py-0.5 leading-tight font-extrabold tracking-[-0.03em] text-ink ${
          compact ? 'text-[20px]' : 'text-title'
        }`}
      />
    );
  }

  const editable = onEdit
    ? {
        title: '双击修改',
        onMouseDown: (event: MouseEvent) => {
          // 双击时别让系统顺手选中一个词
          if (event.detail > 1) event.preventDefault();
        },
        onDoubleClick: (event: MouseEvent) => {
          // 双击的是音标胶囊（发音按钮）就不进编辑
          if ((event.target as HTMLElement).closest('button')) return;
          setEditing(true);
        },
      }
    : {};

  if (result.status !== 'done') {
    // 词典没好时先显示点的那个词，星标那边会是禁用状态
    return (
      <h2 className={wordTitleClass(compact)} {...editable}>
        {query}
      </h2>
    );
  }

  const entry = result.data;
  // 查的是变形（went）时说明它对应哪个原形，不区分大小写
  const inflected = query.toLowerCase() !== entry.word.toLowerCase();

  return (
    <h2 className={wordTitleClass(compact)} {...editable}>
      {inflected ? (
        <>
          <span className="font-normal text-ink-soft">{query}</span>
          <span className="text-[14px] text-ink-soft">→</span>
        </>
      ) : null}
      {entry.word}
      <PhoneticPill word={entry.word} phonetic={entry.phonetic} />
    </h2>
  );
}
