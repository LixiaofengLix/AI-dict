import { invoke } from '@tauri-apps/api/core';

/**
 * 取当前选中的文字。
 *
 * Rust 里优先走系统辅助功能接口，拿不到才模拟一次复制读剪贴板（会等快捷键的修饰键松开，
 * 取完把剪贴板恢复原样）。没选中文字（或选中的不是文字）时返回空字符串；
 * 没有辅助功能权限之类的问题会抛异常。
 */
export async function getSelectedText(): Promise<string> {
  return invoke<string>('get_selected_text');
}
