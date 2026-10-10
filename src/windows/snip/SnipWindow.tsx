import { useEffect, useRef, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { finishSnip } from '../../services/window';

/** 框得比这还小（逻辑像素）当作手抖点了一下，按取消算 */
const MIN_SIZE = 4;

interface Point {
  x: number;
  y: number;
}

/**
 * 截图翻译的框选窗口（Windows，8.2）：铺满光标所在的显示器，盖一层淡遮罩，拖一个框松手就报回选区。
 * Esc、右键、切到别的窗口都算取消。窗口是复用的，每次结束都把拖框状态清掉。
 */
export default function SnipWindow() {
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  // 一次框选只报一次：藏窗口本身也会触发失焦，不能再报一个"取消"
  const doneRef = useRef(false);

  function finish(region: Parameters<typeof finishSnip>[0]) {
    if (doneRef.current) return;
    doneRef.current = true;
    setStart(null);
    setEnd(null);
    void finishSnip(region);
  }

  useEffect(() => {
    const appWindow = getCurrentWindow();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(null);
    };
    window.addEventListener('keydown', onKeyDown);
    const unlisten = appWindow.onFocusChanged(({ payload: focused }) => {
      // 每次显示都会拿到焦点，从这里开始算新的一次
      if (focused) doneRef.current = false;
      else finish(null);
    });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      void unlisten.then((fn) => fn());
    };
  }, []);

  async function submit(from: Point, to: Point) {
    const left = Math.min(from.x, to.x);
    const top = Math.min(from.y, to.y);
    const width = Math.abs(to.x - from.x);
    const height = Math.abs(to.y - from.y);
    if (width < MIN_SIZE || height < MIN_SIZE) {
      finish(null);
      return;
    }
    // 页面坐标是逻辑像素，截屏要虚拟桌面上的物理像素：乘缩放、加上窗口所在的位置
    const appWindow = getCurrentWindow();
    const origin = await appWindow.innerPosition();
    const scale = await appWindow.scaleFactor();
    finish({
      x: origin.x + Math.round(left * scale),
      y: origin.y + Math.round(top * scale),
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    });
  }

  const rect =
    start && end
      ? {
          left: Math.min(start.x, end.x),
          top: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
        }
      : null;

  return (
    <div
      className={`fixed inset-0 cursor-crosshair select-none ${rect ? '' : 'bg-scrim'}`}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          finish(null);
          return;
        }
        // 抓住指针：框里是透明的，拖到哪儿都要收得到移动和松手
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = { x: event.clientX, y: event.clientY };
        setStart(point);
        setEnd(point);
      }}
      onPointerMove={(event) => {
        if (start) setEnd({ x: event.clientX, y: event.clientY });
      }}
      onPointerUp={(event) => {
        if (start) void submit(start, { x: event.clientX, y: event.clientY });
      }}
    >
      {/* 框里透明、框外靠一圈大阴影压暗，看得清框住了什么 */}
      {rect && (
        <div
          className="absolute border-2 border-primary shadow-[0_0_0_9999px_var(--color-scrim)]"
          style={rect}
        />
      )}
    </div>
  );
}
