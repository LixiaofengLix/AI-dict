import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

// 占位页：0.3 换成 popup / main 两个窗口入口。
// 留一个调用 Rust 的按钮，用来确认前端到 Rust 的链路是通的。
function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');

  async function greet() {
    setGreetMsg(await invoke<string>('greet', { name }));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <h1 className="text-2xl font-semibold">AI-dict</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">工程初始化完成</p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-600"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="输入名字"
        />
        <button
          className="rounded bg-neutral-900 px-3 py-1 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
          type="submit"
        >
          打招呼
        </button>
      </form>
      <p className="text-sm">{greetMsg}</p>
    </main>
  );
}

export default App;
