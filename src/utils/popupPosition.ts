/** 弹窗左上角相对光标的偏移，别贴着光标盖住划过的地方 */
const CURSOR_OFFSET = 12;

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 算弹窗该摆在哪儿：默认光标右下角，超出工作区就往回收。
 * 单位都是物理像素 —— 光标、窗口尺寸、显示器工作区都取自 Tauri，口径一致。
 * 窗口比工作区还大时先保左上角。
 * 光标位置是浮点（逻辑点 × 缩放），而窗口位置只收整数，所以最后取整。
 */
export function placeNearCursor(
  cursor: { x: number; y: number },
  size: Size,
  area: Rect,
): { x: number; y: number } {
  const maxX = area.x + area.width - size.width;
  const maxY = area.y + area.height - size.height;

  return {
    x: Math.round(Math.max(area.x, Math.min(cursor.x + CURSOR_OFFSET, maxX))),
    y: Math.round(Math.max(area.y, Math.min(cursor.y + CURSOR_OFFSET, maxY))),
  };
}
