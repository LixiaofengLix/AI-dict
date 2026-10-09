import { Skeleton } from '../../../components/Skeleton';

type Props = {
  /** 流式输出中的部分文本；null 表示首包还没到，显示骨架 */
  meaning: string | null;
  /** 失败原因；中途失败时 meaning 保留已输出的部分 */
  error?: string | null;
  onRetry?: () => void;
};

/**
 * 语境释义卡片（5.3）：这个词在点它的那句话里是什么意思（先说这个，词典释义在后面）。
 * 失败给原因和小号重试——卡片里放不下整块的 AiFailed。
 */
export function ContextCard({ meaning, error = null, onRetry }: Props) {
  return (
    <section className="shrink-0">
      <p className="mb-1.5 px-0.5 text-caption font-medium tracking-wide text-ink-faint">
        语境释义
      </p>
      <div className="rounded-card border border-line bg-surface px-3 py-2.5">
        {meaning ? (
          <p className="text-body leading-relaxed break-words text-ink">{meaning}</p>
        ) : null}
        {error ? (
          <div className={`flex items-center justify-between gap-3 ${meaning ? 'mt-2' : ''}`}>
            <p className="text-callout text-ink-body">{error}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="shrink-0 text-callout text-primary hover:underline"
              >
                重试
              </button>
            ) : null}
          </div>
        ) : meaning ? null : (
          <div className="flex flex-col gap-2 py-0.5">
            <Skeleton width="90%" />
            <Skeleton width="60%" />
          </div>
        )}
      </div>
    </section>
  );
}
