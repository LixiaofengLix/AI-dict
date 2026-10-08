/** 每个查词 Tab 顶部：来源说明 + 重新生成按钮 */
export function TabToolbar({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <p className="text-caption text-ink-faint">
        {loading ? 'AI 生成中…' : '由 AI 生成，仅供参考'}
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1 text-caption text-ink-soft hover:text-ink disabled:opacity-40"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M20 12a8 8 0 1 1-2.34-5.66" />
          <path d="M20 4v4h-4" />
        </svg>
        重新生成
      </button>
    </div>
  );
}
