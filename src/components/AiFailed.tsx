/** AI 请求失败：给中文原因和重试。词卡、语境释义、翻译各处共用 */
export function AiFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <p className="text-callout text-ink-body">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-field border border-line bg-surface px-4 py-1.5 text-callout text-ink-body hover:text-ink"
      >
        重试
      </button>
    </div>
  );
}
