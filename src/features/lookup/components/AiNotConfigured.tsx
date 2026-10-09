/** 没配置 AI 时的引导：说清楚为什么什么都没有，给一条去设置的路（4.3） */
export function AiNotConfigured({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      <p className="text-body font-medium text-ink">还没有配置 AI 服务</p>
      <p className="max-w-[17rem] text-caption leading-relaxed text-ink-soft">
        查词内容由 AI 生成。填写自己的 API Key 后，就能看到 AI 词典、单词簇和常见搭配。
      </p>
      <button
        type="button"
        onClick={onOpenSettings}
        className="rounded-field bg-primary px-4 py-1.5 text-callout text-on-primary"
      >
        去设置 API Key
      </button>
    </div>
  );
}
