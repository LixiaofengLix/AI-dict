/**
 * 这次回车是不是输入法在选词，选词的回车不能当成提交。
 * WebKit（WKWebView）有个坑：确认候选词那一下 compositionend 先于 keydown 到，
 * 等 keydown 时 isComposing 已经是 false 了，只有 keyCode 229（VK_PROCESSKEY，被输入法处理过的键）
 * 还认得出它。所以两个都要看，靠记 compositionstart/end 的状态没用（WebKit bug 165004）。
 */
export function isImeEnter(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}
