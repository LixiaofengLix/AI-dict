import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Keys } from '../../components/Keys';
import { Mascot } from '../../components/Mascot';
import { buttonClass, CAPTION } from '../../components/styles';
import AiConfigPage from '../../features/settings/AiConfigPage';
import { VocabularyPage } from '../../features/vocabulary/VocabularyPage';
import { aiImpl } from '../../services/ai/impl';
import { registerShortcuts, type FailedShortcut } from '../../services/shortcut';
import {
  MAIN_PAGE_EVENT,
  POPUP_ACTION_LABELS,
  showMainWindow,
  type MainPage,
  type MainPagePayload,
} from '../../services/window';

const PAGES: readonly { value: MainPage; label: string }[] = [
  { value: 'vocabulary', label: '生词本' },
  { value: 'settings', label: '设置' },
];

// 主窗口：生词本（6.2）、设置（3.4 起是 AI 配置页，7.1 补快捷键、口音、开机启动）。1.1 起从托盘打开
export default function MainWindow() {
  const [page, setPage] = useState<MainPage>('vocabulary');
  const [failedShortcuts, setFailedShortcuts] = useState<FailedShortcut[]>([]);

  useEffect(() => {
    // 托盘菜单点"生词本 / 设置"时切到对应页（事件名和 Rust 侧一致）
    const unlisten = listen<MainPagePayload>(MAIN_PAGE_EVENT, (event) => {
      setPage(event.payload.page);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const failed = await registerShortcuts();
      if (failed.length > 0) {
        // 快捷键注册失败时把主窗口叫出来提示
        setFailedShortcuts(failed);
        await showMainWindow();
        return;
      }
      // 还没配置 AI 时启动就把主窗口打开（4.3）：首次使用从填 Key 开始，配好之后不再自动弹
      if (!(await aiImpl.isConfigured())) {
        setPage('settings');
        await showMainWindow();
      }
    })();
  }, []);

  return (
    <main className="flex h-screen flex-col bg-surface text-ink">
      {/* 顶栏（样张 .main-win .bar）：窗口用系统标题栏，这里只放右边的切页胶囊 */}
      <header className="flex h-[41px] shrink-0 items-center justify-end border-b border-line bg-soft px-3">
        <nav role="tablist" aria-label="主窗口" className="flex gap-1.5">
          {PAGES.map(({ value, label }) => {
            const selected = value === page;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setPage(value)}
                className={`rounded-full px-3 py-1 text-footnote font-bold ${
                  selected ? 'bg-ink text-surface' : 'text-ink-body hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      {failedShortcuts.length > 0 && (
        <ShortcutBanner failed={failedShortcuts} onOpenSettings={() => setPage('settings')} />
      )}

      <div className="min-h-0 flex-1">
        {page === 'vocabulary' ? <VocabularyPage /> : <AiConfigPage />}
      </div>
    </main>
  );
}

/** 快捷键冲突提示条（样张 13）：黑描边、淡橙底，按键显示成键帽 */
function ShortcutBanner({
  failed,
  onOpenSettings,
}: {
  failed: FailedShortcut[];
  onOpenSettings: () => void;
}) {
  return (
    <div className="mx-5 mt-3 flex shrink-0 items-center gap-2.5 rounded-[18px] border-[2.5px] border-ink bg-banner px-3.5 py-2.5 shadow-solid">
      <Mascot kind="orange" />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">
          这几个快捷键被别的程序占用了，没能注册：
        </p>
        {failed.map(({ action, accelerator }) => (
          <p key={action} className={`mt-1 flex flex-wrap items-center gap-1.5 ${CAPTION}`}>
            <Keys accelerator={accelerator} />
            <span className="ml-0.5 text-ink-body">
              {POPUP_ACTION_LABELS[action]} —— 去「设置」换一个
            </span>
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenSettings}
        className={`ml-auto shrink-0 ${buttonClass('dark', 'sm')}`}
      >
        去设置
      </button>
    </div>
  );
}
