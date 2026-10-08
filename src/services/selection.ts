import { invoke } from '@tauri-apps/api/core';

/**
 * 取当前选中的文字。
 *
 * Rust 里优先走系统辅助功能接口，拿不到才模拟一次复制读剪贴板（会等快捷键的修饰键松开，
 * 取完把剪贴板恢复原样）。没选中文字（或选中的不是文字）时返回空字符串；
 * 真的出错（剪贴板打不开之类）才抛异常。
 *
 * 没授权时同样返回空字符串，不会报错——要不要给授权引导由调用方判断，见 isAccessibilityTrusted。
 */
export async function getSelectedText(): Promise<string> {
  return invoke<string>('get_selected_text');
}

/**
 * 有没有取词要用的辅助功能权限。Windows 上没有这一项，恒为 true。
 *
 * 这个值可能滞后：刚在系统设置里授完权，它也可能还返回 false（系统把结果缓存进了进程）。
 * 所以它不适合拿来挡在取词前面，只用来在没取到文字时判断要不要给授权引导。
 */
export async function isAccessibilityTrusted(): Promise<boolean> {
  return invoke<boolean>('is_accessibility_trusted');
}

/**
 * 请系统弹一次辅助功能授权提示，返回弹完之后的权限状态。
 * macOS 只在没授权时有反应；顺带把本应用加进「隐私与安全性 → 辅助功能」的名单。
 */
export async function requestAccessibilityPermission(): Promise<boolean> {
  return invoke<boolean>('request_accessibility_permission');
}

/** 打开「系统设置 → 隐私与安全性 → 辅助功能」 */
export async function openAccessibilitySettings(): Promise<void> {
  return invoke<void>('open_accessibility_settings');
}
