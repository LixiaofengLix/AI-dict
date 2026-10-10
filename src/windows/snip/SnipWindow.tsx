import { useEffect, useRef, useState } from 'react';
import { currentMonitor, getCurrentWindow } from '@tauri-apps/api/window';
import { captureScreenRegion, type ScreenRegion } from '../../services/ocr';
import { finishSnip } from '../../services/window';

/** 框得比这还小（逻辑像素）当作手抖点了一下，按取消算 */
const MIN_SIZE = 4;

interface Point {
  x: number;
  y: number;
}

/**
 * 截图翻译的框选窗口（Windows，8.2；9.2 起按 pot 的做法重写）。
 *
 * 窗口在光标所在的显示器上全屏铺开，挂载后先把整个显示器截成一张图（这时窗口还藏着，
 * 截到的是没被挡住的干净屏幕），把图铺满窗口，图加载完再让窗口显示自己；用户在图上拖框，
 * 松手按图片的自然尺寸把选区裁下来，把裁好的 PNG 报回主窗口、关掉自己。
 *
 * 铺静态图而不是开透明窗口盖在活的屏幕上（原来那样）：透明窗口在 Windows 上毛病多——
 * 显示时页面还没画好会先闪一帧浅灰；改过尺寸的窗口第二次显示时 WebView 不一定跟着变；
 * 而且"藏窗口再截活屏幕"还有个遮罩没褪干净的时间差要等。pot 也是这么做的。
 */
export default function SnipWindow() {
  const [image, setImage] = useState<string | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  // 自己画的准星位置：系统十字光标压在浅色遮罩上看不清
  const [pointer, setPointer] = useState<Point | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  // 一次框选只报一次：关窗口本身也会触发失焦，不能再报一个"取消"
  const doneRef = useRef(false);

  function finish(regionImage: string | null) {
    if (doneRef.current) return;
    doneRef.current = true;
    setStart(null);
    setEnd(null);
    setPointer(null);
    void finishSnip(regionImage);
  }

  // 进来先截屏：窗口这时还藏着，截到的就是干净的屏幕；截的就是窗口所在的那块显示器
  useEffect(() => {
    void (async () => {
      const monitor = await currentMonitor();
      if (!monitor) throw new Error('找不到当前显示器');
      const region: ScreenRegion = {
        x: monitor.position.x,
        y: monitor.position.y,
        width: monitor.size.width,
        height: monitor.size.height,
      };
      setImage(`data:image/png;base64,${await captureScreenRegion(region)}`);
    })().catch((error: unknown) => {
      console.error('截图失败', error);
      finish(null);
    });
  }, []);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(null);
    };
    window.addEventListener('keydown', onKeyDown);
    // 切到别的窗口算取消
    const unlisten = appWindow.onFocusChanged(({ payload: focused }) => {
      if (!focused) finish(null);
    });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      void unlisten.then((fn) => fn());
    };
  }, []);

  /** 松手：按图片的自然尺寸把选区裁下来 */
  function submit(from: Point, to: Point) {
    const element = imageRef.current;
    const left = Math.min(from.x, to.x);
    const top = Math.min(from.y, to.y);
    const width = Math.abs(to.x - from.x);
    const height = Math.abs(to.y - from.y);
    if (!element || width < MIN_SIZE || height < MIN_SIZE) {
      finish(null);
      return;
    }
    // 窗口里是逻辑像素、图是物理像素，按图片自然宽度和显示宽度的比换算
    const scale = element.naturalWidth / element.clientWidth;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    if (!context) {
      finish(null);
      return;
    }
    context.drawImage(
      element,
      Math.round(left * scale),
      Math.round(top * scale),
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    // 只把 base64 那截给 Rust（ocr_system 收的就是这个格式）
    finish(canvas.toDataURL('image/png').slice('data:image/png;base64,'.length));
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
      className="fixed inset-0 cursor-none select-none"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          finish(null);
          return;
        }
        // 抓住指针：拖到哪儿都要收得到移动和松手
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = { x: event.clientX, y: event.clientY };
        setPointer(point);
        setStart(point);
        setEnd(point);
      }}
      onPointerMove={(event) => {
        setPointer({ x: event.clientX, y: event.clientY });
        if (start) setEnd({ x: event.clientX, y: event.clientY });
      }}
      onPointerUp={(event) => {
        if (start) submit(start, { x: event.clientX, y: event.clientY });
      }}
    >
      {image && (
        <img
          ref={imageRef}
          src={image}
          alt=""
          draggable={false}
          className="pointer-events-none fixed inset-0 h-full w-full select-none"
          onLoad={() => {
            // 等两帧再显示：onLoad 时图只是解码好了、还没画到屏幕上，立刻显示会先闪一帧空白窗口
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                const appWindow = getCurrentWindow();
                void appWindow.show();
                void appWindow.setFocus();
              }),
            );
          }}
          onError={() => finish(null)}
        />
      )}
      {/* 压暗：还没开始拖时整屏压暗，开始拖之后框里透明、框外靠一圈大阴影压暗 */}
      {rect ? (
        <div
          className="pointer-events-none absolute border-2 border-primary shadow-[0_0_0_9999px_var(--color-scrim)]"
          style={rect}
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-scrim" />
      )}
      {/* 自己画的准星：系统十字光标压在浅色遮罩上看不清 */}
      {pointer && (
        <>
          <div
            className="pointer-events-none fixed inset-y-0 w-px bg-primary"
            style={{ left: pointer.x }}
          />
          <div
            className="pointer-events-none fixed inset-x-0 h-px bg-primary"
            style={{ top: pointer.y }}
          />
        </>
      )}
    </div>
  );
}
