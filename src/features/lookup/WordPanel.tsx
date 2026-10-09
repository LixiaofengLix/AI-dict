import { useState } from 'react';
import type { StarDetails } from '../../services/vocabulary';
import { briefMeaning } from './briefMeaning';
import { ContextCard } from './components/ContextCard';
import { StarButton } from './components/StarButton';
import { WordHeader } from './components/WordHeader';
import { useAiWordResult } from './hooks/useAiWordResult';
import { useContextMeaning } from './hooks/useContextMeaning';
import { WordCard } from './WordCard';

type Props = {
  /** 点的那个词（原句里的形式，如 went） */
  word: string;
  /** 点它时所在的那一句，当语境传给 AI；单词模式（4.2）下为空字符串 */
  sentence: string;
  /** 句子模式的"返回译文"；单词模式没有这一行 */
  onBack?: () => void;
};

/**
 * 词卡（5.3 + 6.1）：词头（原形、音标、发音、收藏星标）+ 语境释义（句子模式才有）
 * + AI 词典 / 单词簇 / 常见搭配三个 Tab。
 * 点词就并行请求语境释义和 AI 词典（第 3 节的取舍）：词典结果词头和星标都要用。
 * 句子模式换词时由 SentenceView 换 key 整块重新挂载：上一个词还在跑的请求跟着取消。
 */
export function WordPanel({ word, sentence, onBack }: Props) {
  // 两个"重新生成"各记各的：重试失败的结果都不会进缓存，直接加 1 就行
  const [contextGeneration, setContextGeneration] = useState(0);
  const [dictGeneration, setDictGeneration] = useState(0);
  const context = useContextMeaning(word, sentence, contextGeneration);
  const dict = useAiWordResult('aiDictionary', word, sentence, dictGeneration);

  // 收藏要原形和简要释义，都来自 AI 词典；词典没好（或失败）时星标禁用
  const starDetails: StarDetails | null =
    dict.status === 'done'
      ? {
          word: dict.data.word,
          phonetic: dict.data.phonetic,
          briefMeaning: briefMeaning(dict.data),
          query: word,
          sentence,
          // 语境释义还在流式或失败时存当时已收到的部分
          contextMeaning: context.text,
        }
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex shrink-0 items-center gap-0.5 text-callout text-ink-soft hover:text-ink"
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
        ) : null}
        <WordHeader query={word} result={dict} />
        <StarButton details={starDetails} sentence={sentence} />
      </div>

      {/* 单词模式没有语境可解释，也不请求 */}
      {sentence ? (
        <ContextCard
          meaning={context.text}
          error={context.error}
          onRetry={() => setContextGeneration((count) => count + 1)}
        />
      ) : null}

      <WordCard
        word={word}
        sentence={sentence}
        dict={dict}
        onRefreshDict={() => setDictGeneration((count) => count + 1)}
      />
    </div>
  );
}
