import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  POPUP_ACTION_LABELS,
  POPUP_TRIGGER_EVENT,
  type PopupTriggerPayload,
} from '../../services/window';
import {
  openAccessibilitySettings,
  requestAccessibilityPermission,
} from '../../services/selection';

/** 失焦后等这么久再关：Windows 上拖动窗口会短暂失焦，立刻关会误伤（pot 踩过这个坑） */
const BLUR_CLOSE_DELAY = 100;

// 划词翻译 / 输入翻译弹窗：按触发方式定位、失焦关闭、可拖动、可固定
export default function PopupWindow() {
  const [trigger, setTrigger] = useState<PopupTriggerPayload | null>(null);
  const [draft, setDraft] = useState('');
  const [submitted, setSubmitted] = useState('');
  // 每呼出一次加一，给输入框当 key 用：弹窗是复用的同一个窗口，组件不会重新挂载，
  // 不换 key 的话 autoFocus 只有第一次生效——上次要是在按钮上收的场，下次呼出来光标还在按钮上
  const [summonCount, setSummonCount] = useState(0);
  const [pinned, setPinned] = useState(false);
  // 失焦回调里要读最新的固定状态，用 ref 同步一份
  const pinnedRef = useRef(false);

  useEffect(() => {
    const unlisten = listen<PopupTriggerPayload>(POPUP_TRIGGER_EVENT, (event) => {
      setTrigger(event.payload);
      // 每次触发都是一次新的查询：上一次输的内容和结果都清掉
      setDraft('');
      setSubmitted('');
      setSummonCount((count) => count + 1);
    });
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

  /** 提交输入框里的内容。2.3 只原样显示出来，4.1 的分类和 5.x 的模式接上来之后走这里 */
  function submit() {
    const text = draft.trim();
    if (text) setSubmitted(text);
  }

  /**
   * 弹窗分几屏。划词没取到文字、或取词失败时，也进输入界面（2.3）：按了快捷键却什么都
   * 不发生，比给个能直接输入的框更糟。
   */
  function renderBody() {
    if (!trigger) return null;

    if (trigger.action === 'selection') {
      const selection = trigger.selection;
      if (!selection) return null;
      // 取词失败：把原因说清楚，同时让用户能直接输入
      if (!selection.ok) return renderInput(`取词失败（${selection.error}），直接输入也一样。`);
      // 没授权和"没选中"不是一回事：前者给授权引导（见 2.2）
      if (!selection.text && !selection.trusted) return <PermissionView />;
      if (!selection.text) return renderInput('没选中文字，直接输入也一样。');
      return <ResultView text={selection.text} />;
    }

    return renderInput();
  }

  /** 输入翻译这一屏：输入框在上，提交的文本显示在下面 */
  function renderInput(note?: string) {
    return (
      <>
        <InputView
          key={summonCount}
          note={note}
          value={draft}
          onChange={setDraft}
          onSubmit={submit}
        />
        {submitted && <ResultView text={submitted} />}
      </>
    );
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
        {renderBody()}
      </main>
    </div>
  );
}

/**
 * 2.3 的临时界面：把取到的文字（或输入的内容）原样显示出来。
 * 4.1 的分类和 5.x 的单词 / 句子模式接上来之后，这里换成真正的翻译界面。
 */
function ResultView({ text }: { text: string }) {
  return (
    <p className="min-h-0 flex-1 overflow-y-auto rounded bg-neutral-100 p-2 text-sm break-words whitespace-pre-wrap dark:bg-neutral-800">
      {text}
    </p>
  );
}

/** 输入翻译（5.4）：顶部输入框，回车提交、Shift+回车换行 */
function InputView({
  note,
  value,
  onChange,
  onSubmit,
}: {
  note?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {note && <p className="text-xs text-neutral-500 dark:text-neutral-400">{note}</p>}
      <div className="flex items-start gap-2">
        <textarea
          autoFocus
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return;
            // 输入法里回车是选词，不能当成提交。WebKit（WKWebView）有个坑：确认候选词那一下
            // compositionend 先于 keydown 到，等 keydown 时 isComposing 已经是 false 了，
            // 只有 keyCode 229（VK_PROCESSKEY，被输入法处理过的键）还认得出它。
            // 所以两个都要看，靠记 compositionstart/end 的状态没用（WebKit bug 165004）
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
            event.preventDefault();
            onSubmit();
          }}
          placeholder="输入或粘贴单词、句子"
          className="min-w-0 flex-1 resize-none rounded border border-neutral-200 bg-transparent px-2 py-1 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:focus:border-neutral-500"
        />
        <button
          type="button"
          onClick={onSubmit}
          className="rounded bg-neutral-900 px-2 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          翻译
        </button>
      </div>
    </div>
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
