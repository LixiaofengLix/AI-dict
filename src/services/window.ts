import { emitTo } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
  cursorPosition,
  monitorFromPoint,
  PhysicalPosition,
  primaryMonitor,
  type Monitor,
} from '@tauri-apps/api/window';
import { centerInWorkArea, placeNearCursor, type Rect } from '../utils/popupPosition';
import { getSelectedText, isAccessibilityTrusted } from './selection';

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

/**
 * 划词翻译的取词结果。
 *
 * 拿到结果时一并带上辅助功能权限：文字是空的时候，界面要靠它区分"没选中东西"和"没授权"。
 * 有文字就别管这个值——权限查询可能滞后，取到文字说明实际是通的。
 */
export type SelectionResult =
  { ok: true; text: string; trusted: boolean } | { ok: false; error: string };

export interface PopupTriggerPayload {
  action: PopupAction;
  /** 划词翻译取到的结果；输入翻译不带这个字段 */
  selection?: SelectionResult;
}

function workAreaOf(monitor: Monitor): Rect {
  return {
    x: monitor.workArea.position.x,
    y: monitor.workArea.position.y,
    width: monitor.workArea.size.width,
    height: monitor.workArea.size.height,
  };
}

/**
 * 摆弹窗：划词摆到光标右下角（用户刚在那儿划的词），输入翻译摆在工作区正中间。
 * 两种都先按光标位置反查是哪块显示器，副屏上也不会摆回主屏。
 */
async function placePopup(popup: WebviewWindow, action: PopupAction): Promise<void> {
  const cursor = await cursorPosition();
  const monitor = (await monitorFromPoint(cursor.x, cursor.y)) ?? (await primaryMonitor());
  if (!monitor) return;

  const size = await popup.outerSize();
  const area = workAreaOf(monitor);
  const position =
    action === 'input' ? centerInWorkArea(size, area) : placeNearCursor(cursor, size, area);
  await popup.setPosition(new PhysicalPosition(position.x, position.y));
}

/**
 * 把弹窗叫出来：摆好位置、告诉它触发方式，然后显示。
 * 弹窗是复用的同一个窗口，连续触发不会多开。
 */
export async function showPopup(action: PopupAction): Promise<void> {
  const popup = await WebviewWindow.getByLabel('popup');
  if (!popup) return;

  // 划词翻译要在弹窗显示之前取词：辅助功能接口和模拟复制都要求被划词的应用还是前台，
  // 弹窗一显示焦点就跑到我们这边了。走辅助功能接口时取词是微秒级的，弹窗照样立刻出现
  const payload: PopupTriggerPayload = action === 'selection' ? await takeSelection() : { action };

  // 先定位再显示，免得窗口在旧位置闪一下
  await placePopup(popup, action);
  await emitTo('popup', POPUP_TRIGGER_EVENT, payload);
  await popup.show();
  await popup.setFocus();
}

/**
 * 把主窗口叫出来（弹窗里的"去设置"、启动时没配置 AI 都走这里）。
 * 窗口是隐藏而不是销毁的，和 Rust 的 show_window 一样先取消最小化再显示。
 */
export async function showMainWindow(): Promise<void> {
  const main = await WebviewWindow.getByLabel('main');
  if (!main) return;
  // 没最小化时调它也无妨，失败不影响后面两步，忽略掉
  await main.unminimize().catch(() => {});
  await main.show();
  await main.setFocus();
}

/** 取当前选中的文字，失败时把错误信息一起带给弹窗 */
async function takeSelection(): Promise<PopupTriggerPayload> {
  try {
    // 权限状态和取词各问一次：取词不靠权限把关（缓存可能滞后），两个结果一起交给弹窗判断
    const trusted = await isAccessibilityTrusted();
    const text = await getSelectedText();
    return { action: 'selection', selection: { ok: true, text, trusted } };
  } catch (error) {
    console.error('取选中文字失败', error);
    return { action: 'selection', selection: { ok: false, error: String(error) } };
  }
}
