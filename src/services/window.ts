import { emitTo } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
  cursorPosition,
  monitorFromPoint,
  PhysicalPosition,
  primaryMonitor,
  type Monitor,
} from '@tauri-apps/api/window';
import { placeNearCursor, type Rect } from '../utils/popupPosition';

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

function workAreaOf(monitor: Monitor): Rect {
  return {
    x: monitor.workArea.position.x,
    y: monitor.workArea.position.y,
    width: monitor.workArea.size.width,
    height: monitor.workArea.size.height,
  };
}

/** 把弹窗摆到光标右下角，所在显示器装不下就往回收 */
async function moveToCursor(popup: WebviewWindow): Promise<void> {
  const cursor = await cursorPosition();
  // 光标可能在任意一块显示器上，按光标位置反查是哪一块
  const monitor = (await monitorFromPoint(cursor.x, cursor.y)) ?? (await primaryMonitor());
  if (!monitor) return;

  const size = await popup.outerSize();
  const position = placeNearCursor(cursor, size, workAreaOf(monitor));
  await popup.setPosition(new PhysicalPosition(position.x, position.y));
}

/**
 * 把弹窗叫出来：摆到光标旁、告诉它触发方式，然后显示。
 * 弹窗是复用的同一个窗口，连续触发不会多开。
 */
export async function showPopup(action: PopupAction): Promise<void> {
  const popup = await WebviewWindow.getByLabel('popup');
  if (!popup) return;

  // 先定位再显示，免得窗口在旧位置闪一下
  await moveToCursor(popup);
  await emitTo('popup', POPUP_TRIGGER_EVENT, { action } satisfies PopupTriggerPayload);
  await popup.show();
  await popup.setFocus();
}
