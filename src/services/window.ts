import { emit, emitTo, listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
  cursorPosition,
  getCurrentWindow,
  monitorFromPoint,
  PhysicalPosition,
  primaryMonitor,
  type Monitor,
} from '@tauri-apps/api/window';
import { isMac } from '../utils/platform';
import { centerInWorkArea, placeNearCursor, type Rect } from '../utils/popupPosition';
import { captureScreenshot, isScreenCaptureTrusted, recognizeText } from './ocr';
import { getSelectedText, isAccessibilityTrusted } from './selection';

/** 弹窗的三种触发方式：划词取词、手动输入、截图识别 */
export type PopupAction = 'selection' | 'input' | 'ocr';

export const POPUP_ACTION_LABELS: Record<PopupAction, string> = {
  selection: '划词翻译',
  input: '输入翻译',
  ocr: '截图翻译',
};

/**
 * 通知弹窗它是被怎么触发的。事件名和 payload 要和 src-tauri/src/lib.rs 里托盘那处保持一致。
 */
export const POPUP_TRIGGER_EVENT = 'popup-trigger';

/**
 * 划词翻译的取词结果，截图翻译的识别结果也是这个形状。
 *
 * 拿到结果时一并带上权限（划词是辅助功能，截图是屏幕录制）：文字是空的时候，界面要靠它区分
 * "没选中 / 没认出字"和"没授权"。有文字就别管这个值——权限查询可能滞后，拿到文字说明实际是通的。
 */
export type SelectionResult =
  { ok: true; text: string; trusted: boolean } | { ok: false; error: string };

/**
 * 截图识别的结果。pending 表示图已经截好了、识别还在跑——弹窗先出来显示"识别中"，
 * 云端 OCR / 大模型读图可能要几秒，不能等它们跑完才让用户看到反应。
 */
export type OcrResult =
  | { ok: true; text: string; trusted: boolean; pending?: boolean }
  | { ok: false; error: string };

export interface PopupTriggerPayload {
  action: PopupAction;
  /** 截图识别的请求编号：识别结果晚到时用它丢弃过期结果 */
  requestId?: number;
  /** 划词翻译取到的结果 */
  selection?: SelectionResult;
  /** 截图翻译识别出的结果 */
  ocr?: OcrResult;
}

/** 截图识别完成（或失败）后，把最终结果补发给已经打开的弹窗 */
export const POPUP_OCR_RESULT_EVENT = 'popup-ocr-result';

export interface OcrResultPayload {
  requestId: number;
  ocr: OcrResult;
}

/** 主窗口的两个页面（6.2 加的生词本） */
export type MainPage = 'vocabulary' | 'settings';

/**
 * 告诉主窗口切到哪一页。事件名和 payload 要和 src-tauri/src/lib.rs 里托盘那处保持一致，
 * 托盘菜单项的 id 就是这里的页名。
 */
export const MAIN_PAGE_EVENT = 'main-page';

export interface MainPagePayload {
  page: MainPage;
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
 * 弹窗窗口比卡片大一圈的透明留白（逻辑像素），给 PopupWindow 里那条 CSS 投影用。
 * 要和 tauri.conf.json 的 popup 尺寸（468×608 对 420×560）和 PopupWindow 的 p-6 一起改。
 */
const POPUP_PADDING = 24;

/**
 * 摆弹窗：划词和截图摆到光标右下角（用户刚在那儿划的词、框完松手），输入翻译摆在工作区正中间。
 * 两种都先按光标位置反查是哪块显示器，副屏上也不会摆回主屏。
 * 窗口外面那圈留白是透明的，所以按卡片尺寸算位置、再把窗口往回挪一圈——
 * 用户看到的卡片就落在算出来的位置上。
 */
async function placePopup(popup: WebviewWindow, action: PopupAction): Promise<void> {
  const cursor = await cursorPosition();
  const monitor = (await monitorFromPoint(cursor.x, cursor.y)) ?? (await primaryMonitor());
  if (!monitor) return;

  // outerSize、setPosition 都是物理像素，留白按显示器缩放换算过来
  const size = await popup.outerSize();
  const padding = Math.round(POPUP_PADDING * (await popup.scaleFactor()));
  const card = { width: size.width - padding * 2, height: size.height - padding * 2 };
  const area = workAreaOf(monitor);
  const position =
    action === 'input' ? centerInWorkArea(card, area) : placeNearCursor(cursor, card, area);
  await popup.setPosition(new PhysicalPosition(position.x - padding, position.y - padding));
}

/** 系统框选界面是否开着 */
let capturing = false;

/** 截图识别请求的编号，晚到的结果不能覆盖新一次请求 */
let ocrRequestId = 0;

/** 摆好位置、发触发事件、显示并聚焦 */
async function presentPopup(
  popup: WebviewWindow,
  action: PopupAction,
  payload: PopupTriggerPayload,
): Promise<void> {
  // 先定位再显示，免得窗口在旧位置闪一下
  await placePopup(popup, action);
  await emitTo('popup', POPUP_TRIGGER_EVENT, payload);
  await popup.show();
  await popup.setFocus();
}

/**
 * 把弹窗叫出来：摆好位置、告诉它触发方式，然后显示。
 * 弹窗是复用的同一个窗口，连续触发不会多开。
 */
export async function showPopup(action: PopupAction): Promise<void> {
  const popup = await WebviewWindow.getByLabel('popup');
  if (!popup) return;

  if (action === 'ocr') {
    // 框选界面还开着时又按了一次：系统截图不能叠两层，忽略
    if (capturing) return;
    capturing = true;
    const requestId = ++ocrRequestId;
    try {
      // 图先拿在手里：Windows 上框选窗口自己截屏、裁好（见 pickScreenImage），macOS 走系统框选
      let image: string | null;
      try {
        image = isMac ? await captureScreenshot() : await pickScreenImage();
      } catch (error) {
        console.error('截图失败', error);
        await presentPopup(popup, action, {
          action,
          requestId,
          ocr: { ok: false, error: String(error) },
        });
        return;
      }
      // 用户按 Esc 取消了框选，什么都不弹
      if (image === null) return;

      // 先把弹窗叫出来，别等识别：大模型读图 / 云 OCR 可能要几秒
      await presentPopup(popup, action, {
        action,
        requestId,
        ocr: { ok: true, text: '', trusted: true, pending: true },
      });

      let ocr: OcrResult;
      try {
        const text = await recognizeText(image);
        // 认出了字说明权限是通的，不用再问
        const trusted = text ? true : await isScreenCaptureTrusted();
        ocr = { ok: true, text, trusted };
      } catch (error) {
        console.error('截图识别失败', error);
        ocr = { ok: false, error: String(error) };
      }
      // 弹窗已经开着，把最终结果补给它；用户已经关了或又触发了别的，弹窗自己按 requestId 丢弃
      await emitTo('popup', POPUP_OCR_RESULT_EVENT, { requestId, ocr } satisfies OcrResultPayload);
    } finally {
      capturing = false;
    }
    return;
  }

  // 划词翻译要在弹窗显示之前取词：辅助功能接口和模拟复制都要求被划词的应用还是前台，
  // 弹窗一显示焦点就跑到我们这边了。走辅助功能接口时取词是微秒级的，弹窗照样立刻出现
  const payload: PopupTriggerPayload =
    action === 'selection' ? await takeSelection() : { action };
  await presentPopup(popup, action, payload);
}

/**
 * 把主窗口叫出来（弹窗里的"去设置"、启动时没配置 AI 都走这里）。
 * 传了 page 就先让主窗口切页再显示，免得先闪一下原来那页。
 * 窗口是隐藏而不是销毁的，和 Rust 的 show_window 一样先取消最小化再显示。
 */
export async function showMainWindow(page?: MainPage): Promise<void> {
  const main = await WebviewWindow.getByLabel('main');
  if (!main) return;
  if (page) {
    await emitTo('main', MAIN_PAGE_EVENT, { page } satisfies MainPagePayload);
  }
  // 没最小化时调它也无妨，失败不影响后面两步，忽略掉
  await main.unminimize().catch(() => {});
  await main.show();
  await main.setFocus();
}

/** 框选窗口（Windows）松手或取消时发的事件，payload 是 SnipResultPayload */
export const SNIP_RESULT_EVENT = 'snip-result';

export interface SnipResultPayload {
  /** 裁好的选区图（PNG base64）；Esc、右键、切走或框得太小时为 null */
  image: string | null;
}

/**
 * Windows 上让用户框选一块屏幕：在光标所在的显示器上开一个全屏的框选窗口（windows/snip），
 * 窗口自己截屏铺图、框选、裁剪，把裁好的图报回来；取消时返回 null。macOS 用系统框选，不走这里。
 */
async function pickScreenImage(): Promise<string | null> {
  const cursor = await cursorPosition();
  const monitor = (await monitorFromPoint(cursor.x, cursor.y)) ?? (await primaryMonitor());
  if (!monitor) return null;

  let resolveImage: (image: string | null) => void = () => {};
  const result = new Promise<string | null>((resolve) => (resolveImage = resolve));
  // 先挂好监听再建窗口，免得用户手快、结果先到
  const unlisten = await listen<SnipResultPayload>(SNIP_RESULT_EVENT, (event) =>
    resolveImage(event.payload.image),
  );

  try {
    await createSnipWindow(monitor);
    return await result;
  } finally {
    unlisten();
  }
}

/**
 * 建框选窗口：全屏、无边框、置顶、不进任务栏，落在给定的显示器上，先藏着——
 * 页面自己截完屏、把图铺好才显示自己（见 windows/snip），所以不会先闪一帧没画完的窗口。
 * 每次框选都新建、用完就关，不留跨次的状态（pot 也是这么做的）。
 */
async function createSnipWindow(monitor: Monitor): Promise<WebviewWindow> {
  // 万一有上次遗留的框选窗口（窗口里的脚本崩了、没走到销毁那一步），先清掉，
  // 不然建同名的会报 "already exists"
  const leftover = await WebviewWindow.getByLabel('snip');
  if (leftover) await leftover.destroy();

  return new Promise((resolve, reject) => {
    const snip = new WebviewWindow('snip', {
      url: 'index.html',
      title: '截图翻译',
      decorations: false,
      // 透明：不是为了让底下的东西透出来（窗口里铺的是整屏的图），而是为了"图还没画好"的
      // 那一两帧不闪白——不透明的窗口显示早了就是一块整屏的白。pot 的窗口也都是透明的
      transparent: true,
      shadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      fullscreen: true,
      visible: false,
      // 全屏铺在哪块显示器看窗口的位置；创建时按逻辑像素给，多显示器缩放不同时下面再按物理像素摆一次
      x: Math.round(monitor.position.x / monitor.scaleFactor),
      y: Math.round(monitor.position.y / monitor.scaleFactor),
    });
    void snip.once('tauri://created', async () => {
      await snip.setPosition(new PhysicalPosition(monitor.position.x, monitor.position.y));
      resolve(snip);
    });
    void snip.once('tauri://error', (event) => reject(new Error(String(event.payload))));
  });
}

/** 框选窗口里调：把裁好的图（取消时为 null）报给等着的 pickScreenImage，然后销毁自己 */
export async function finishSnip(image: string | null): Promise<void> {
  await emit(SNIP_RESULT_EVENT, { image } satisfies SnipResultPayload);
  // 用 destroy 不能用 close：应用里"关窗只隐藏"（见 lib.rs 的 on_window_event，主窗口和弹窗是这么设计的），
  // close 只会把它藏起来，下次框选再建就报 "a webview with label `snip` already exists"
  await getCurrentWindow().destroy();
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
