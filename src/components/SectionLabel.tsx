import type { ReactNode } from 'react';

/**
 * 区块标题（样张 .label）：青绿小菱形 + 小字标题，右边可以挂「重新生成」。
 * muted 是次要区块（句意解释），字和菱形都浅一档。
 */
export function SectionLabel({
  title,
  muted = false,
  action = null,
  className = '',
}: {
  title: string;
  muted?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mb-1.5 ml-0.5 flex items-center gap-[7px] text-caption font-bold tracking-[0.06em] ${
        muted ? 'text-ink-faint' : 'text-ink-soft'
      } ${className}`}
    >
      <span
        aria-hidden
        className={`h-[7px] w-[7px] shrink-0 rotate-45 ${muted ? 'bg-ink-mute' : 'bg-mint'}`}
      />
      {title}
      {action ? <span className="ml-auto tracking-normal">{action}</span> : null}
    </p>
  );
}
