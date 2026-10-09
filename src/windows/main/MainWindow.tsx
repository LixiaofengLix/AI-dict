import { useEffect, useState } from 'react';
import AiConfigPage from '../../features/settings/AiConfigPage';
import { aiImpl } from '../../services/ai/impl';
import { registerShortcuts, type FailedShortcut } from '../../services/shortcut';
import { POPUP_ACTION_LABELS, showMainWindow } from '../../services/window';

// 主窗口：设置（3.4 起是 AI 配置页，7.1 补快捷键、口音、开机启动；6.2 加生词本）。1.1 起从托盘打开
export default function MainWindow() {
  const [failedShortcuts, setFailedShortcuts] = useState<FailedShortcut[]>([]);

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

      <AiConfigPage />
    </main>
  );
}
