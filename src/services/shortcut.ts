import { register, unregister, type ShortcutEvent } from '@tauri-apps/plugin-global-shortcut';
import { getShortcuts, type Shortcuts } from './settings';
import { POPUP_ACTION_LABELS, showPopup, type PopupAction } from './window';

/** 两个动作，注册和重新注册都按这个顺序 */
const ACTIONS = ['selection', 'input'] as const satisfies readonly PopupAction[];

export interface FailedShortcut {
  action: PopupAction;
  accelerator: string;
}

/** 当前这套快捷键（注册失败但没得回滚的也算在里面，下次启动会再试） */
let current: Shortcuts | null = null;

let started = false;
const startupFailed: FailedShortcut[] = [];

/** 设置页录快捷键时全局快捷键先注销，不然按到已注册的组合会直接弹窗，网页收不到按键 */
let paused = false;

/** 注册、注销、暂停、恢复都排队一个个来，免得录完立刻保存时和恢复注册撞在一起 */
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

/**
 * 启动时注册（主窗口挂载时调）。返回注册失败的动作（快捷键被别的程序占用时注册会失败）。
 * 重复调用只做第一次：React 的 StrictMode 会把 effect 跑两遍。
 */
export async function registerShortcuts(): Promise<FailedShortcut[]> {
  if (started) return startupFailed;
  started = true;
  const shortcuts = await getShortcuts();
  const { failed } = await serial(() => applyNow(shortcuts));
  startupFailed.push(...failed);
  return startupFailed;
}

/**
 * 把两个快捷键切到 next（设置页保存时调）：和当前不同的一对先取消再注册，
 * 注册失败的回滚到原来的键并记进失败列表。
 * 返回实际生效的快捷键——调用方按它存库，失败的键不写进去，下次启动还是老样子。
 */
export function applyShortcuts(
  next: Shortcuts,
): Promise<{ failed: FailedShortcut[]; applied: Shortcuts }> {
  return serial(async () => {
    await resumeNow();
    return applyNow(next);
  });
}

/** 录快捷键期间注销全部全局快捷键（设置页开始录时调） */
export function pauseShortcuts(): Promise<void> {
  return serial(async () => {
    if (paused || !current) return;
    paused = true;
    for (const action of ACTIONS) {
      await unregister(current[action]).catch(() => {});
    }
  });
}

/** 录完（或放弃）后把当前这套快捷键注册回去 */
export function resumeShortcuts(): Promise<void> {
  return serial(resumeNow);
}

async function resumeNow(): Promise<void> {
  if (!paused || !current) return;
  paused = false;
  for (const action of ACTIONS) {
    const accelerator = current[action];
    await registerOne(accelerator, () => void showPopup(action)).catch((error: unknown) => {
      console.error(`${POPUP_ACTION_LABELS[action]} 的快捷键 ${accelerator} 恢复注册失败`, error);
    });
  }
}

async function applyNow(
  next: Shortcuts,
): Promise<{ failed: FailedShortcut[]; applied: Shortcuts }> {
  const failed: FailedShortcut[] = [];
  const applied = { ...next };

  for (const action of ACTIONS) {
    const accelerator = next[action];
    const previous = current?.[action];
    if (previous === accelerator) {
      continue;
    }

    if (previous) {
      // 旧键可能因为热更新残留着失效的回调，取消失败不影响注册新的
      await unregister(previous).catch(() => {});
    }
    try {
      await registerOne(accelerator, () => void showPopup(action));
    } catch (error) {
      console.error(`${POPUP_ACTION_LABELS[action]} 的快捷键 ${accelerator} 注册失败`, error);
      failed.push({ action, accelerator });
      if (previous) {
        // 回滚到原来的快捷键。回滚也失败的话这个动作暂时没有快捷键，等下次启动再试
        applied[action] = previous;
        await registerOne(previous, () => void showPopup(action)).catch(() => {});
      }
    }
  }

  current = applied;
  return { failed, applied };
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
