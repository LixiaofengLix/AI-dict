import { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listWords, removeWord, type VocabularyListItem } from '../../services/vocabulary';
import { formatRelative } from './relativeTime';
import { WordDetail } from './WordDetail';

/**
 * 生词本（6.2）：列表（按时间倒序、搜索、删除）+ 详情。
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
    } catch (error) {
      console.warn('删除生词失败', error);
    }
  }

  if (selectedId !== null) {
    return <WordDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const keyword = query.trim().toLowerCase();
  const shown = words?.filter(
    (word) => !keyword || `${word.word} ${word.briefMeaning}`.toLowerCase().includes(keyword),
  );

  return (
    <div className="mx-auto max-w-xl px-5 py-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-title font-semibold text-ink">生词本</h1>
        {words !== null && words.length > 0 ? (
          <span className="text-footnote text-ink-soft">共 {words.length} 个</span>
        ) : null}
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索单词或释义"
        className="mt-4 w-full rounded-field border border-line bg-surface px-3 py-2 text-callout text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint"
      />

      {shown === undefined ? (
        <p className="mt-6 text-callout text-ink-soft">正在读生词本…</p>
      ) : shown.length === 0 ? (
        <p className="mt-10 text-center text-callout text-ink-soft">
          {keyword ? '没有匹配的生词' : '还没有生词。在词卡上点星标，生词连同语境就会收到这里。'}
        </p>
      ) : (
        <ul className="mt-2">
          {shown.map((word) => (
            <li key={word.id} className="flex items-center gap-3 border-b border-line py-3">
              <button
                type="button"
                onClick={() => setSelectedId(word.id)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-body font-semibold text-ink">{word.word}</span>
                  {word.phonetic ? (
                    <span className="text-footnote text-ink-soft">/{word.phonetic}/</span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-callout text-ink-body">
                  {word.briefMeaning}
                </span>
                <span className="mt-0.5 block text-caption text-ink-faint">
                  {word.contextCount} 条语境 · {formatRelative(word.createdAt)}
                </span>
              </button>
              {confirming === word.id ? (
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void remove(word.id)}
                    className="rounded-field bg-danger px-2.5 py-1 text-caption text-on-primary"
                  >
                    删除
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="px-1.5 py-1 text-caption text-ink-soft hover:text-ink"
                  >
                    取消
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(word.id)}
                  className="shrink-0 px-1.5 py-1 text-caption text-ink-faint hover:text-danger"
                >
                  删除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
