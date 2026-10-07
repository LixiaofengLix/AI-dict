import { emitTo } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

/** 弹窗的两种触发方式：划词取词、手动输入 */
export type PopupAction = 'selection' | 'input';

export const POPUP_ACTION_LABELS: Record<PopupAction, string> = {
  selection: '划词翻译',
  input: '输入翻译',
};

/**
 * 通知弹窗它是被怎么触发的。事件名和 payload 要和 src-tauri/src/lib.rs 里托盘那处保持一致。
 */
export const POPUP_TRIGGER_EVENT = 'popup-trigger';

export interface PopupTriggerPayload {
  action: PopupAction;
}

/**
 * 把弹窗叫出来，并告诉它触发方式。
 * 先发事件再显示，省得弹窗先闪一下旧内容。1.3 会改成按鼠标位置弹出。
 */
export async function showPopup(action: PopupAction): Promise<void> {
  const popup = await WebviewWindow.getByLabel('popup');
  if (!popup) return;

  await emitTo('popup', POPUP_TRIGGER_EVENT, { action } satisfies PopupTriggerPayload);
  await popup.show();
  await popup.setFocus();
}
