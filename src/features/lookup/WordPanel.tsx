import { useState } from 'react';
import { useContextMeaning } from './hooks/useContextMeaning';
import { ContextCard } from './components/ContextCard';
import { WordCard } from './WordCard';

type Props = {
  /** 点的那个词（原句里的形式，如 went） */
  word: string;
  /** 点它时所在的那一句，当语境传给 AI */
  sentence: string;
  onBack: () => void;
};

/**
 * 词卡（5.3）：返回译文 + 语境释义（流式）+ AI 词典 / 单词簇 / 常见搭配三个 Tab。
 * 词头只有点的那个词——原形、音标、发音在 AI 词典 Tab 里，按 5.2 规则 4 不提前请求。
 * 换词时由 SentenceView 换 key 整块重新挂载：上一个词还在跑的请求跟着取消。
 */
export function WordPanel({ word, sentence, onBack }: Props) {
  // 语境释义的重试次数（失败的结果不会进缓存，不用跳过缓存）
  const [generation, setGeneration] = useState(0);
  const context = useContextMeaning(word, sentence, generation);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-0.5 text-callout text-ink-soft hover:text-ink"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          返回译文
        </button>
        <p className="min-w-0 truncate text-body font-medium text-ink">{word}</p>
      </div>

      <ContextCard
        meaning={context.text}
        error={context.error}
        onRetry={() => setGeneration((count) => count + 1)}
      />

      {/* 三个 Tab：切过去才第一次请求，重新生成按 Tab 各自计数 */}
      <WordCard word={word} sentence={sentence} />
    </div>
  );
}
