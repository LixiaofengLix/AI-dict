/**
 * 当前是不是 macOS。
 * 两个平台的 WebView UA 分别带 "Macintosh"（WKWebView）和 "Windows NT"（WebView2）。
 * 只用来挑平台相关的默认值（快捷键等），不要拿它区分功能实现。
 */
export const isMac = navigator.userAgent.includes('Macintosh');
