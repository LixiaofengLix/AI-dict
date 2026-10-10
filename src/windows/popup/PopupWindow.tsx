import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Mascot } from '../../components/Mascot';
import { buttonClass, CAPTION, CARD, tagClass } from '../../components/styles';
import { WordPanel } from '../../features/lookup/WordPanel';
import { AiNotConfigured } from '../../features/lookup/components/AiNotConfigured';
import { useAiConfigured } from '../../features/lookup/hooks/useAiConfigured';
import { SentenceView } from '../../features/sentence/SentenceView';
import {
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
            // 主窗口切到设置页；弹窗自己收起来，免得固定着挡在旁边
            void showMainWindow('settings').then(() => getCurrentWindow().hide());
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
        {submitted ? renderResult(submitted) : <InputHint />}
      </>
    );
  }

  /** 取到 / 输入的文字按 5.1 分类渲染：单词和词组出词卡，句子和中文出翻译界面 */
  function renderResult(text: string) {
    // 配置还在读（毫秒级）时先空着：没配置的情况 renderBody 已经拦下了，这里只是别闪一下
    if (configured !== true) return null;
    if (classifyInput(text) === 'word') {
      // 划过来的词可能带着引号、逗号（“give up”、went,），查词只用里面的词
      const word = text.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      // 单词模式：没有原句，语境释义和它所在的卡片都不出现（4.2）
      // key 用词本身：换一个词整卡重挂载，Tab 的加载状态和"重新生成"次数从头开始
      return <WordPanel key={word} word={word} sentence="" />;
    }
    // 同理：换一段文字整段重挂载，流式内容和"重新生成"次数不残留
    return <SentenceView key={text} text={text} />;
  }

  return (
    // 窗口比卡片大一圈（tauri.conf.json 里 468×608 对 420×560），这一圈是透明的留白，
    // 给下面这条 CSS 投影用——系统阴影会在窗口边上压出一条黑线，所以关掉了（见 DEV_PLAN 取舍）
    <div className="h-screen p-6">
      <div className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface text-ink shadow-pop">
        <header
          data-tauri-drag-region
          className="flex shrink-0 items-center justify-end border-b border-line px-3 py-2 text-caption font-semibold text-ink-soft"
        >
          <span className="flex gap-3.5">
            <button
              type="button"
              onClick={() => void togglePinned()}
              aria-pressed={pinned}
              className={`font-semibold ${pinned ? 'text-primary' : 'text-ink-soft hover:text-ink'}`}
            >
              {pinned ? '已固定' : '固定'}
            </button>
            <button
              type="button"
              onClick={() => void getCurrentWindow().hide()}
              className="font-semibold text-ink-soft hover:text-ink"
            >
              关闭
            </button>
          </span>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-2.5 p-3">{renderBody()}</main>
      </div>
    </div>
  );
}

/** 输入翻译（5.4，样张 07 / 08）：5 行高的气泡输入框，回车提交、Shift+回车换行 */
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
    <>
      {/* 输入框是气泡形：左下角那个小圆角是"话从这儿说出来"的角（样张里的 .field.bubble） */}
      <textarea
        autoFocus
        rows={5}
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
        className="w-full shrink-0 resize-none rounded-[16px_16px_16px_4px] border border-line bg-soft px-3 py-[9px] text-[13px] text-ink outline-none placeholder:text-ink-soft focus:border-ink"
      />
      {note && (
        <p className="flex shrink-0 items-center gap-1.5 text-caption font-semibold text-ink-body">
          <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
          {note}
        </p>
      )}
    </>
  );
}

/** 输入翻译的空状态（样张 07）：两只小角色 + 键盘提示，占满下面的空白 */
function InputHint() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5">
      <div className="flex items-end gap-3">
        <Mascot kind="mint" />
        <Mascot kind="orange" />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {['回车提交', 'Shift + 回车换行', 'Esc 关闭'].map((hint) => (
          <span key={hint} className={tagClass()}>
            {hint}
          </span>
        ))}
      </div>
    </div>
  );
}

const PERMISSION_STEPS = [
  '点下面的按钮，系统会先弹一次提示',
  '在「隐私与安全性 → 辅助功能」打开 AI-dict',
  '回来再按一次快捷键，不用重启',
];

/**
 * 没有辅助功能权限时的引导（macOS，样张 09）。系统设置一打开，弹窗就失去焦点关掉了，
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
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
      <Mascot kind="black" className="self-center" />
      <div className={CARD.feature}>
        <span className={tagClass('orange')}>macOS · 辅助功能</span>
        <p className="mt-2.5 text-[16px] leading-[1.35] font-extrabold tracking-[-0.02em] text-ink">
          取词要用「辅助功能」权限，现在还没开。
        </p>
        <ol className="mt-2.5">
          {PERMISSION_STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-2.5 border-b border-line py-[7px] text-[12.5px] font-semibold text-ink last:border-b-0"
            >
              <b className="text-caption text-ink-soft tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </b>
              {step}
              <i aria-hidden className="ml-auto h-[7px] w-[7px] shrink-0 bg-ink" />
            </li>
          ))}
        </ol>
        <p className={`mt-1.5 ${CAPTION}`}>开发期从终端启动时，这个权限算在终端头上。</p>
      </div>
      <button
        type="button"
        onClick={() => void openSettings()}
        className={`self-center ${buttonClass('accent')}`}
      >
        打开系统设置
      </button>
      {error && <p className="text-center text-caption text-danger">{error}</p>}
    </div>
  );
}
