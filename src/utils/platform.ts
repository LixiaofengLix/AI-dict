/**
 * 当前是不是 macOS。
 * 两个平台的 WebView UA 分别带 "Macintosh"（WKWebView）和 "Windows NT"（WebView2）。
 * 只用来挑平台相关的默认值（快捷键等），不要拿它区分功能实现。
 * 唯一的例外是截图翻译的框选：macOS 用系统的，Windows 没有、只能自己开窗口（DEV_PLAN 8.2）。
 */
export const isMac = navigator.userAgent.includes('Macintosh');
