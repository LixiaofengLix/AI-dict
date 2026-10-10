/** 「重新生成」胶囊（样张 .regen）：放在区块标题那一行的最右边，生成中时图标转 */
export function RefreshChip({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={loading}
      className="inline-flex items-center gap-[5px] rounded-full bg-segment px-2 py-[3px] text-caption font-bold text-ink-body hover:text-ink disabled:cursor-default disabled:hover:text-ink-body"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-[11px] w-[11px] ${loading ? 'animate-spin' : ''}`}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 4v5h-5" />
      </svg>
      {loading ? '生成中' : '重新生成'}
    </button>
  );
}
