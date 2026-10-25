import { invoke } from '@tauri-apps/api/core';

/**
 * 重启应用。屏幕录制权限授权后必须重启进程才生效——托盘是常驻的，
 * 关窗口只是隐藏，重新点图标也只会把主窗口叫出来，不等于重启。
 */
export function restartApp(): Promise<void> {
  return invoke('restart_app');
}
