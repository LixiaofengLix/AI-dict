import { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Mascot } from '../../components/Mascot';
import { buttonClass, CAPTION, CENTER_TITLE, PILL_FIELD } from '../../components/styles';
import { listWords, removeWord, type VocabularyListItem } from '../../services/vocabulary';
import { formatRelative } from './relativeTime';
import { WordDetail } from './WordDetail';

/**
 * 生词本（6.2，样张 11 / 13）：左栏列表（按时间倒序、搜索、删除），右栏选中那个词的详情。
 * 搜索在本地过滤：个人自用，量级用不着进 SQL。
 */
export function VocabularyPage() {
  const [words, setWords] = useState<VocabularyListItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // 正在等二次确认的行（防误删，删词会把它的语境一起删掉）
  const [confirming, setConfirming] = useState<string | null>(null);

  const reload = useCallback(() => {
    // setState 放在 then 里：effect 里直接调它也不能同步改状态
    listWords()
      .then((list) => setWords(list))
      .catch((error: unknown) => {
        console.warn('读取生词本失败', error);
      });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 窗口每次拿到焦点都重读：弹窗里刚收藏的词，切回主窗口马上能看到
  useEffect(() => {
    const unlisten = getCurrentWindow().onFocusChanged(({ payload: focused }) => {
      if (focused) void reload();
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [reload]);

  async function remove(id: string) {
    setConfirming(null);
    try {
      await removeWord(id);
      setWords((prev) => prev?.filter((word) => word.id !== id) ?? null);
      if (selectedId === id) setSelectedId(null);
    } catch (error) {
      console.warn('删除生词失败', error);
    }
  }

  const keyword = query.trim().toLowerCase();
  const shown = words?.filter(
    (word) => !keyword || `${word.word} ${word.briefMeaning}`.toLowerCase().includes(keyword),
  );

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_400px]">
      <div className="scroll-thin min-h-0 overflow-y-auto border-r border-line px-5 py-[18px]">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-title font-extrabold tracking-[-0.03em] text-ink">生词本</h1>
          {words !== null ? (
            <span className="rounded-full bg-segment px-2.5 py-[3px] text-caption font-bold text-ink-body">
              共 {words.length} 个
            </span>
          ) : null}
        </div>

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索单词或释义"
          className={`mt-3 mb-1 ${PILL_FIELD}`}
        />

        {shown === undefined ? (
          <p className={`mt-6 ${CAPTION}`}>正在读生词本…</p>
        ) : words?.length === 0 ? (
          <EmptyState />
        ) : shown.length === 0 ? (
          <p className={`mt-10 text-center ${CAPTION}`}>没有匹配的生词</p>
        ) : (
          <ul>
            {shown.map((word) => {
              const selected = word.id === selectedId;
              return (
                <li
                  key={word.id}
                  className={`flex items-center gap-2.5 rounded-[12px] border-b px-2.5 py-[9px] hover:bg-soft ${
                    selected ? 'border-transparent bg-soft outline-2 outline-ink' : 'border-line'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(word.id)}
                    aria-current={selected}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block">
                      <b className="text-[14px] font-bold text-ink">{word.word}</b>
                      {word.phonetic ? (
                        <span className="ml-2 text-caption text-ink-soft">/{word.phonetic}/</span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-footnote text-ink-body">
                      {word.briefMeaning}
                    </span>
                    <span className="mt-0.5 block text-caption text-ink-soft">
                      {word.contextCount} 条语境 · {formatRelative(word.createdAt)}
                    </span>
                  </button>
                  {confirming === word.id ? (
                    <span className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void remove(word.id)}
                        className={buttonClass('danger', 'sm')}
                      >
                        删除
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className={buttonClass('quiet', 'sm')}
                      >
                        取消
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(word.id)}
                      className="shrink-0 rounded-full px-2 py-1 text-caption font-bold text-ink-soft hover:bg-danger-soft hover:text-danger"
                    >
                      删除
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="scroll-thin min-h-0 overflow-y-auto bg-soft px-5 py-[18px]">
        {selectedId !== null ? (
          <WordDetail key={selectedId} id={selectedId} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className={CAPTION}>选一个生词看详情</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** 生词本空状态（样张 13） */
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2.5 pt-[50px] pb-5 text-center">
      <div className="flex items-end gap-3">
        <Mascot kind="black" />
        <Mascot kind="mint" />
      </div>
      <h3 className={CENTER_TITLE}>还没有生词</h3>
      <p className="max-w-[20rem] text-footnote leading-[1.55] text-ink-soft">
        在词卡上点{' '}
        <span className="inline-flex rounded-full bg-primary-soft px-2 py-0.5 text-caption font-bold text-primary-ink">
          ★ 星标
        </span>
        ，生词连同所在的句子、语境释义就会收到这里。
      </p>
    </div>
  );
}
