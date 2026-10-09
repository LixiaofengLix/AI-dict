import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WordCard } from '../../features/lookup/WordCard';
import { AiNotConfigured } from '../../features/lookup/components/AiNotConfigured';
import { useAiConfigured } from '../../features/lookup/hooks/useAiConfigured';
import {
  POPUP_ACTION_LABELS,
  POPUP_TRIGGER_EVENT,
  showMainWindow,
  type PopupTriggerPayload,
} from '../../services/window';
import {
  openAccessibilitySettings,
  requestAccessibilityPermission,
} from '../../services/selection';
import { classifyInput } from '../../utils/classifyInput';

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
  // 每次呼出重新读一遍 AI 配置：用户刚在设置页填完 Key 回来，这里要看到新值
  const configured = useAiConfigured(summonCount);

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

  /** 提交输入框里的内容，和划词取到的文字走同一套分类和渲染 */
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

    // 没配置 AI 时整个弹窗换成引导（4.3）：词卡和翻译都离不开 AI，给输入框也没用。
    // 放在最前面，取词失败、没选中这些提示都不用提了
    if (configured === false) {
      return (
        <AiNotConfigured
          onOpenSettings={() => {
            // 主窗口开着配置页；弹窗自己收起来，免得固定着挡在旁边
            void showMainWindow().then(() => getCurrentWindow().hide());
          }}
        />
      );
    }

    if (trigger.action === 'selection') {
      const selection = trigger.selection;
      if (!selection) return null;
      // 取词失败：把原因说清楚，同时让用户能直接输入
      if (!selection.ok) return renderInput(`取词失败（${selection.error}），直接输入也一样。`);
      // 没授权和"没选中"不是一回事：前者给授权引导（见 2.2）
      if (!selection.text && !selection.trusted) return <PermissionView />;
      if (!selection.text) return renderInput('没选中文字，直接输入也一样。');
      return renderResult(selection.text);
    }

    return renderInput();
  }

  /** 输入翻译这一屏：输入框在上，提交的文本结果显示在下面 */
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
        {submitted && renderResult(submitted)}
      </>
    );
  }

  /** 取到 / 输入的文字按 5.1 分类渲染：单词和词组出词卡，句子和中文等 5.1 的翻译界面 */
  function renderResult(text: string) {
    // 配置还在读（毫秒级）时先空着：没配置的情况 renderBody 已经拦下了，这里只是别闪一下
    if (configured !== true) return null;
    if (classifyInput(text) === 'word') {
      // 划过来的词可能带着引号、逗号（“give up”、went,），查词只用里面的词
      const word = text.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      // key 用词本身：换一个词整卡重挂载，Tab 的加载状态和"重新生成"次数从头开始
      return <WordCard key={word} word={word} />;
    }
    return <ResultView text={text} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <header
        data-tauri-drag-region
        className="flex items-center justify-between border-b border-line px-2 py-1.5"
      >
        <button
          type="button"
          onClick={() => void togglePinned()}
          className={`rounded px-2 py-1 text-caption ${
            pinned ? 'bg-primary text-on-primary' : 'text-ink-soft hover:bg-line'
          }`}
        >
          固定
        </button>
        <button
          type="button"
          onClick={() => void getCurrentWindow().hide()}
          className="rounded px-2 py-1 text-caption text-ink-soft hover:bg-line"
        >
          关闭
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        <h1 className="text-body font-semibold">
          {trigger ? POPUP_ACTION_LABELS[trigger.action] : 'AI-dict 弹窗'}
        </h1>
        {renderBody()}
      </main>
    </div>
  );
}

/**
 * 句子和中文的临时界面：把文字原样显示出来，5.1 换成翻译界面。
 * 单词和词组已经走 WordCard（4.2）。
 */
function ResultView({ text }: { text: string }) {
  return (
    <p className="min-h-0 flex-1 overflow-y-auto rounded-field border border-line bg-surface p-2.5 text-callout break-words whitespace-pre-wrap text-ink-body">
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
      {note && <p className="text-caption text-ink-soft">{note}</p>}
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
          className="min-w-0 flex-1 resize-none rounded-field border border-line bg-surface px-2.5 py-1.5 text-callout text-ink outline-none placeholder:text-ink-faint focus:border-ink-faint"
        />
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-field bg-primary px-3 py-1.5 text-callout text-on-primary"
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
      <p className="text-callout">{'取词要用 macOS 的「辅助功能」权限，现在还没开。'}</p>
      <p className="text-caption text-ink-soft">
        {
          '在「系统设置 → 隐私与安全性 → 辅助功能」里打开 AI-dict 的开关（开发期从终端启动时，这个权限算在终端头上），回来再按一次快捷键就行，不用重启。'
        }
      </p>
      <button
        type="button"
        onClick={() => void openSettings()}
        className="self-start rounded-field bg-primary px-3 py-1.5 text-callout text-on-primary"
      >
        打开系统设置
      </button>
      {error && <p className="text-caption text-danger">{error}</p>}
    </div>
  );
}
