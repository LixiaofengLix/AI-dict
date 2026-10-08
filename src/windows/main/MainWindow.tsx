import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import AiConfigPage from '../../features/settings/AiConfigPage';
import { registerShortcuts, type FailedShortcut } from '../../services/shortcut';
import { POPUP_ACTION_LABELS } from '../../services/window';

// 主窗口：设置（3.4 起是 AI 配置页，7.1 补快捷键、口音、开机启动；6.2 加生词本）。1.1 起从托盘打开
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

      <AiConfigPage />
    </main>
  );
}
