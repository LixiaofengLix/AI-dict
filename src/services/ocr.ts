import { invoke } from '@tauri-apps/api/core';
import { joinOcrLines } from '../utils/joinOcrLines';

/**
 * 弹系统框选截一块屏幕（macOS），返回截图的 PNG base64；用户按 Esc 取消框选时返回 null。
 * Windows 没有系统框选，用下面的 captureScreenRegion。
 */
export async function captureScreenshot(): Promise<string | null> {
  return invoke<string | null>('capture_screenshot');
}

/** 屏幕上的一块区域，物理像素，坐标相对整个虚拟桌面（副屏可能是负数） */
export interface ScreenRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 截下屏幕上的一块（Windows），返回截图的 PNG base64。
 * 选区由框选窗口（windows/snip）给出，见 services/window 的 pickScreenRegion。
 */
export async function captureScreenRegion(region: ScreenRegion): Promise<string> {
  return invoke<string>('capture_screen_region', { region });
}

/**
 * 把图上的文字认出来，拼成一段返回；没认出字返回空字符串。图是上面两个 capture 给的 base64。
 * 现在只有系统 OCR 一条路（Rust 侧的 ocr_system），云 OCR 和大模型读图也接在这条路由上
 * （图拿在同一只手里，换一条识别路线不用重新框选）。
 *
 * 没有屏幕录制权限时截到的其他窗口是空的，同样是空字符串，不会报错——
 * 要不要给授权引导由调用方判断，见 isScreenCaptureTrusted。
 */
export async function recognizeText(image: string): Promise<string> {
  return joinOcrLines(await invoke<string[]>('ocr_system', { image }));
}

/**
 * 有没有截图要用的屏幕录制权限。Windows 上没有这一项，恒为 true。
 * 授权后要重启应用才会变成 true，所以只用来在没认出文字时判断要不要给引导。
 */
export async function isScreenCaptureTrusted(): Promise<boolean> {
  return invoke<boolean>('is_screen_capture_trusted');
}

/** 请系统弹一次屏幕录制授权提示，顺带把本应用加进「隐私与安全性 → 屏幕录制」的名单 */
export async function requestScreenCapturePermission(): Promise<boolean> {
  return invoke<boolean>('request_screen_capture_permission');
}

/** 打开「系统设置 → 隐私与安全性 → 屏幕录制」 */
export async function openScreenCaptureSettings(): Promise<void> {
  return invoke<void>('open_screen_capture_settings');
}
