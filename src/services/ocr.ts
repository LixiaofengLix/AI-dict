import { invoke } from '@tauri-apps/api/core';
import { joinOcrLines } from '../utils/joinOcrLines';

/**
 * 截图翻译：弹出系统框选，框完用系统 OCR 认出里面的文字，拼成一段返回。
 *
 * 用户按 Esc 取消框选时返回 null；框了但没认出字返回空字符串。
 * 没有屏幕录制权限时截到的其他窗口是空的，同样是空字符串，不会报错——
 * 要不要给授权引导由调用方判断，见 isScreenCaptureTrusted。
 */
export async function recognizeScreenshot(): Promise<string | null> {
  const lines = await invoke<string[] | null>('recognize_screenshot');
  return lines === null ? null : joinOcrLines(lines);
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
