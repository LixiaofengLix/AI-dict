import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  POPUP_ACTION_LABELS,
  POPUP_TRIGGER_EVENT,
  type PopupTriggerPayload,
  type SelectionResult,
} from '../../services/window';
import {
  openAccessibilitySettings,
  requestAccessibilityPermission,
} from '../../services/selection';

/** 失焦后等这么久再关：Windows 上拖动窗口会短暂失焦，立刻关会误伤（pot 踩过这个坑） */
const BLUR_CLOSE_DELAY = 100;

// 划词翻译 / 输入翻译弹窗：按鼠标位置弹出、失焦关闭、可拖动、可固定
export default function PopupWindow() {
  const [trigger, setTrigger] = useState<PopupTriggerPayload | null>(null);
  const [pinned, setPinned] = useState(false);
  // 失焦回调里要读最新的固定状态，用 ref 同步一份
  const pinnedRef = useRef(false);

  useEffect(() => {
    const unlisten = listen<PopupTriggerPayload>(POPUP_TRIGGER_EVENT, (event) =>
      setTrigger(event.payload),
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

      <main className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <h1 className="text-base font-semibold">
          {trigger ? POPUP_ACTION_LABELS[trigger.action] : 'AI-dict 弹窗'}
        </h1>
        {trigger?.action === 'selection' && <SelectionView selection={trigger.selection} />}
      </main>
    </div>
  );
}

/** 2.1 的临时界面：把取到的文字原样显示出来，5.1 起换成真正的翻译界面 */
function SelectionView({ selection }: { selection?: SelectionResult }) {
  if (!selection) return null;
  if (!selection.ok) {
    return <p className="text-sm text-red-600 dark:text-red-400">取词失败：{selection.error}</p>;
  }
  // 有文字就说明权限是通的（两条取词路径都要权限），权限查询本身可能滞后，所以只在
  // 一个字都没取到时才看它
  if (!selection.text && !selection.trusted) return <PermissionView />;
  if (!selection.text) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">没取到选中的文字</p>;
  }
  return (
    <p className="min-h-0 flex-1 overflow-y-auto rounded bg-neutral-100 p-2 text-sm break-words whitespace-pre-wrap dark:bg-neutral-800">
      {selection.text}
    </p>
  );
}

/**
 * 没有辅助功能权限时的引导（macOS）。系统设置一打开，弹窗就失去焦点关掉了，
 * 所以这里不用管"授权之后怎么办"——用户回来再按一次快捷键即可，取词那条路会重新判断权限。
 */
function PermissionView() {
  const [error, setError] = useState<string | null>(null);

  async function openSettings() {
    setError(null);
    try {
      // 先请系统提示一次：这是把本应用加进「辅助功能」名单的唯一办法，
      // 不调它，用户在系统设置的列表里根本找不到本应用的开关
      await requestAccessibilityPermission();
      await openAccessibilitySettings();
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-sm">{'取词要用 macOS 的「辅助功能」权限，现在还没开。'}</p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {
          '在「系统设置 → 隐私与安全性 → 辅助功能」里打开 AI-dict 的开关（开发期从终端启动时，这个权限算在终端头上），回来再按一次快捷键就行，不用重启。'
        }
      </p>
      <button
        type="button"
        onClick={() => void openSettings()}
        className="self-start rounded bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900"
      >
        打开系统设置
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
