import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  POPUP_ACTION_LABELS,
  POPUP_TRIGGER_EVENT,
  type PopupAction,
  type PopupTriggerPayload,
} from '../../services/window';

/** 失焦后等这么久再关：Windows 上拖动窗口会短暂失焦，立刻关会误伤（pot 踩过这个坑） */
const BLUR_CLOSE_DELAY = 100;

// 划词翻译 / 输入翻译弹窗：按鼠标位置弹出、失焦关闭、可拖动、可固定
export default function PopupWindow() {
  const [action, setAction] = useState<PopupAction | null>(null);
  const [pinned, setPinned] = useState(false);
  // 失焦回调里要读最新的固定状态，用 ref 同步一份
  const pinnedRef = useRef(false);

  useEffect(() => {
    const unlisten = listen<PopupTriggerPayload>(POPUP_TRIGGER_EVENT, (event) =>
      setAction(event.payload.action),
    );
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const appWindow = getCurrentWindow();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void appWindow.hide();
    };
    window.addEventListener('keydown', onKeyDown);

    const unlisten = appWindow.onFocusChanged(({ payload: focused }) => {
      if (focused || pinnedRef.current) return;
      window.setTimeout(() => {
        // 等完再确认一次：中间又拿回焦点就不关
        void appWindow.isFocused().then((isFocused) => {
          if (!isFocused && !pinnedRef.current) void appWindow.hide();
        });
      }, BLUR_CLOSE_DELAY);
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      void unlisten.then((fn) => fn());
    };
  }, []);

  async function togglePinned() {
    const next = !pinned;
    pinnedRef.current = next;
    setPinned(next);
    await getCurrentWindow().setAlwaysOnTop(next);
  }

  return (
    <div className="flex min-h-screen flex-col text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <header
        data-tauri-drag-region
        className="flex items-center justify-between border-b border-neutral-200 px-2 py-1.5 dark:border-neutral-700"
      >
        <button
          type="button"
          onClick={() => void togglePinned()}
          className={`rounded px-2 py-1 text-xs ${
            pinned
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
          }`}
        >
          固定
        </button>
        <button
          type="button"
          onClick={() => void getCurrentWindow().hide()}
          className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          关闭
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-2">
        <h1 className="text-base font-semibold">AI-dict 弹窗</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {action ? `触发方式：${POPUP_ACTION_LABELS[action]}` : '还没被触发过'}
        </p>
      </main>
    </div>
  );
}
