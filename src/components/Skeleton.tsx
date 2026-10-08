/**
 * 加载占位条：呼吸式闪烁。width 给数字（px）或 CSS 宽度字符串（'60%'）。
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
      className={`animate-pulse rounded bg-line ${className}`}
      style={{ width, height }}
    />
  );
}
