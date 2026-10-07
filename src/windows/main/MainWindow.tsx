// 主窗口：生词本（6.2）和设置（7.1）。1.1 起改成从托盘打开
export default function MainWindow() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <h1 className="text-xl font-semibold">AI-dict</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">主窗口：生词本、设置</p>
    </main>
  );
}
