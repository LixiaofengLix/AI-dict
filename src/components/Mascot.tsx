/** 样张里点缀留白的小角色：圆、三角加两只眼睛；sleepy 是闭着眼的黑球（失败页用） */
export type MascotKind = 'black' | 'mint' | 'purple' | 'orange' | 'sleepy';

const SIZES: Record<MascotKind, { width: number; height: number }> = {
  black: { width: 76, height: 76 },
  mint: { width: 58, height: 58 },
  purple: { width: 62, height: 58 },
  orange: { width: 44, height: 44 },
  sleepy: { width: 76, height: 76 },
};

/** size 是高度，宽度按比例算；不给就用样张里的尺寸 */
export function Mascot({
  kind,
  size,
  className = '',
}: {
  kind: MascotKind;
  size?: number;
  className?: string;
}) {
  const box = SIZES[kind];
  const height = size ?? box.height;
  const width = (height * box.width) / box.height;

  return (
    <svg
      aria-hidden
      width={width}
      height={height}
      viewBox={`0 0 ${box.width} ${box.height}`}
      className={`shrink-0 ${className}`}
    >
      <Shape kind={kind} />
    </svg>
  );
}

function Shape({ kind }: { kind: MascotKind }) {
  switch (kind) {
    case 'black':
      return (
        <>
          <circle cx="38" cy="38" r="38" className="fill-ink" />
          <ellipse cx="28" cy="34" rx="5.5" ry="9" className="fill-surface" />
          <ellipse cx="48" cy="34" rx="5.5" ry="9" className="fill-surface" />
        </>
      );
    case 'mint':
      return (
        <>
          <circle cx="29" cy="29" r="29" className="fill-mint" />
          <ellipse cx="21" cy="26" rx="4" ry="7" className="fill-surface" />
          <ellipse cx="37" cy="26" rx="4" ry="7" className="fill-surface" />
        </>
      );
    case 'purple':
      return (
        <>
          <path d="M31 4 58 54H4Z" className="fill-purple" />
          <ellipse cx="24" cy="40" rx="4" ry="6.5" className="fill-surface" />
          <ellipse cx="38" cy="40" rx="4" ry="6.5" className="fill-surface" />
        </>
      );
    case 'orange':
      return (
        <>
          <circle cx="22" cy="22" r="22" className="fill-primary" />
          <ellipse cx="17" cy="20" rx="3" ry="5" className="fill-surface" />
          <ellipse cx="28" cy="20" rx="3" ry="5" className="fill-surface" />
        </>
      );
    case 'sleepy':
      return (
        <>
          <circle cx="38" cy="38" r="38" className="fill-ink" />
          <path
            d="M22 36q6 5 12 0M42 36q6 5 12 0"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="fill-none stroke-surface"
          />
        </>
      );
  }
}
