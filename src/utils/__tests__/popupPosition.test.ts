import { describe, expect, it } from 'vitest';
import { centerInWorkArea, placeNearCursor } from '../popupPosition';

// 弹窗 420x560，见 src-tauri/tauri.conf.json
const POPUP = { width: 420, height: 560 };
const MAIN_SCREEN = { x: 0, y: 0, width: 1920, height: 1080 };

describe('placeNearCursor', () => {
  it('常规位置摆在光标右下角，留 12px 偏移', () => {
    expect(placeNearCursor({ x: 500, y: 400 }, POPUP, MAIN_SCREEN)).toEqual({ x: 512, y: 412 });
  });

  it('主屏右下角往回收', () => {
    expect(placeNearCursor({ x: 1918, y: 1078 }, POPUP, MAIN_SCREEN)).toEqual({ x: 1500, y: 520 });
  });

  it('主屏左上角不会越出工作区', () => {
    const workArea = { x: 0, y: 25, width: 1920, height: 1055 };
    expect(placeNearCursor({ x: 0, y: 25 }, POPUP, workArea)).toEqual({ x: 12, y: 37 });
  });

  it('工作区带偏移时（macOS 菜单栏）不钻到菜单栏下面', () => {
    const workArea = { x: 0, y: 25, width: 1920, height: 1055 };
    expect(placeNearCursor({ x: 5, y: 30 }, POPUP, workArea)).toEqual({ x: 17, y: 42 });
  });

  it('副屏左上角：留在副屏，不会被推回主屏', () => {
    const secondScreen = { x: 1920, y: 0, width: 2560, height: 1440 };
    expect(placeNearCursor({ x: 1925, y: 100 }, POPUP, secondScreen)).toEqual({
      x: 1937,
      y: 112,
    });
  });

  it('副屏右下角：仍然收在副屏里', () => {
    const secondScreen = { x: 1920, y: 0, width: 2560, height: 1440 };
    expect(placeNearCursor({ x: 4470, y: 1430 }, POPUP, secondScreen)).toEqual({
      x: 4060,
      y: 880,
    });
  });

  it('窗口比工作区还大时先保左上角', () => {
    const tiny = { x: 0, y: 0, width: 300, height: 200 };
    expect(placeNearCursor({ x: 100, y: 100 }, POPUP, tiny)).toEqual({ x: 0, y: 0 });
  });

  it('光标是浮点（2 倍屏上 Tauri 给的就是浮点）时取整', () => {
    expect(placeNearCursor({ x: 100.71875, y: 200.5 }, POPUP, MAIN_SCREEN)).toEqual({
      x: 113,
      y: 213,
    });
  });
});

describe('centerInWorkArea', () => {
  it('主屏正中', () => {
    expect(centerInWorkArea(POPUP, MAIN_SCREEN)).toEqual({ x: 750, y: 260 });
  });

  it('工作区带偏移时（macOS 菜单栏）以工作区为准，不是整块屏幕', () => {
    const workArea = { x: 0, y: 25, width: 1920, height: 1055 };
    expect(centerInWorkArea(POPUP, workArea)).toEqual({ x: 750, y: 273 });
  });

  it('副屏摆在副屏正中，不会被推回主屏', () => {
    const secondScreen = { x: 1920, y: 0, width: 2560, height: 1440 };
    expect(centerInWorkArea(POPUP, secondScreen)).toEqual({ x: 2990, y: 440 });
  });

  it('窗口比工作区还大时先保左上角', () => {
    const tiny = { x: 0, y: 0, width: 300, height: 200 };
    expect(centerInWorkArea(POPUP, tiny)).toEqual({ x: 0, y: 0 });
  });
});
