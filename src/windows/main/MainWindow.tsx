import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
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
    <main className="min-h-screen bg-page text-ink">
      {failedShortcuts.length > 0 && (
        <div className="mx-5 mt-4 rounded-field border border-danger/40 bg-danger/5 p-3 text-footnote text-danger">
          <p>这几个快捷键被别的程序占用了，没能注册：</p>
          <ul className="mt-1 list-inside list-disc">
            {failedShortcuts.map(({ action, accelerator }) => (
              <li key={action}>
                {POPUP_ACTION_LABELS[action]}：{accelerator}
              </li>
            ))}
          </ul>
        </div>
      )}

      <nav role="tablist" aria-label="主窗口" className="flex gap-1 border-b border-line px-5 pt-3">
        {PAGES.map(({ value, label }) => {
          const selected = value === page;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setPage(value)}
              className={`-mb-px border-b-2 px-3 pb-2 text-callout ${
                selected
                  ? 'border-primary font-medium text-ink'
                  : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {page === 'vocabulary' ? <VocabularyPage /> : <AiConfigPage />}
    </main>
  );
}
