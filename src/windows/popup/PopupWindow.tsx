import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  POPUP_ACTION_LABELS,
  POPUP_TRIGGER_EVENT,
  type PopupAction,
  type PopupTriggerPayload,
} from '../../services/window';

// 划词翻译 / 输入翻译弹窗。1.3 起改成按鼠标位置弹出、失焦关闭
export default function PopupWindow() {
  const [action, setAction] = useState<PopupAction | null>(null);

  useEffect(() => {
    const unlisten = listen<PopupTriggerPayload>(POPUP_TRIGGER_EVENT, (event) => {
      setAction(event.payload.action);
    });
    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <h1 className="text-base font-semibold">AI-dict 弹窗</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {action ? `触发方式：${POPUP_ACTION_LABELS[action]}` : '还没被触发过'}
      </p>
    </main>
  );
}
