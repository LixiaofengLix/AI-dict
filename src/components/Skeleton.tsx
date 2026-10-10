/**
 * 加载占位条（样张 .skel）：一道亮光从右往左扫。width 给数字（px）或 CSS 宽度字符串（'60%'）。
 */
export function Skeleton({
  width = '100%',
  height = 12,
  className = '',
}: {
  width?: number | string;
  height?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`animate-shimmer rounded-[6px] bg-linear-to-r from-segment via-shimmer to-segment bg-size-[200%_100%] ${className}`}
      style={{ width, height }}
    />
  );
}
