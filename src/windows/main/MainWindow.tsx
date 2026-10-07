import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { registerShortcuts, type FailedShortcut } from '../../services/shortcut';
import { POPUP_ACTION_LABELS } from '../../services/window';

// 主窗口：生词本（6.2）和设置（7.1）。1.1 起从托盘打开
export default function MainWindow() {
  const [failedShortcuts, setFailedShortcuts] = useState<FailedShortcut[]>([]);

  useEffect(() => {
    void (async () => {
      const failed = await registerShortcuts();
      if (failed.length === 0) return;

      // 快捷键注册失败时把主窗口叫出来提示
      setFailedShortcuts(failed);
      const appWindow = getCurrentWindow();
      await appWindow.show();
      await appWindow.setFocus();
    })();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <h1 className="text-xl font-semibold">AI-dict</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">主窗口：生词本、设置</p>

      {failedShortcuts.length > 0 && (
        <div className="mt-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
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
    </main>
  );
}
