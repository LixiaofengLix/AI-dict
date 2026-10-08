import { register, unregister, type ShortcutEvent } from '@tauri-apps/plugin-global-shortcut';
import { isMac } from '../utils/platform';
import { POPUP_ACTION_LABELS, showPopup, type PopupAction } from './window';

/**
 * 两个动作的默认快捷键。
 * macOS 用 Option 组合；Windows 上 Alt+字母会被菜单和地址栏吃掉，所以再加 Ctrl。
 * 7.1 起改成从设置里读，这里只作为首次启动的默认值。
 */
export const DEFAULT_SHORTCUTS: Record<PopupAction, string> = isMac
  ? { selection: 'Alt+D', input: 'Alt+S' }
  : { selection: 'Ctrl+Alt+D', input: 'Ctrl+Alt+S' };

export interface FailedShortcut {
  action: PopupAction;
  accelerator: string;
}

let registered = false;
const failedShortcuts: FailedShortcut[] = [];

/**
 * 注册两个全局快捷键，返回注册失败的动作（快捷键被别的程序占用时注册会失败）。
 * 重复调用只会真正注册一次：React 的 StrictMode 会把 effect 跑两遍，第二次注册同一个键会报错。
 */
export async function registerShortcuts(): Promise<FailedShortcut[]> {
  if (registered) return failedShortcuts;
  registered = true;

  for (const action of ['selection', 'input'] as const) {
    const accelerator = DEFAULT_SHORTCUTS[action];
    try {
      await registerOne(accelerator, () => void showPopup(action));
    } catch (error) {
      console.error(`${POPUP_ACTION_LABELS[action]} 的快捷键 ${accelerator} 注册失败`, error);
      failedShortcuts.push({ action, accelerator });
    }
  }

  return failedShortcuts;
}

/**
 * 注册一个快捷键，失败时先取消再试一次。
 *
 * 前端热更新或重载之后，Rust 那边还留着上一次的注册（它的回调指向已经销毁的页面），
 * 这时直接注册会报 "RegisterEventHotKey failed"，于是快捷键就彻底不响应了——
 * 先 unregister 把旧的清掉再注册才能拿到新回调。
 */
async function registerOne(accelerator: string, onPressed: () => void): Promise<void> {
  const handler = (event: ShortcutEvent) => {
    // 按下和松开都会回调，只在按下时触发
    if (event.state === 'Pressed') onPressed();
  };

  try {
    await register(accelerator, handler);
  } catch {
    await unregister(accelerator).catch(() => {});
    await register(accelerator, handler);
  }
}
