// 划词翻译 / 输入翻译弹窗。1.3 起改成按鼠标位置弹出、失焦关闭
export default function PopupWindow() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <h1 className="text-base font-semibold">AI-dict 弹窗</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">划词翻译 / 输入翻译</p>
    </main>
  );
}
