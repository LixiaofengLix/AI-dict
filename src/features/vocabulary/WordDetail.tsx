import { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton';
import {
  getWordDetail,
  type VocabularyContext,
  type VocabularyDetail,
} from '../../services/vocabulary';
import { AiDictSenses } from '../lookup/components/AiDictSenses';
import { PhoneticPill } from '../lookup/components/PhoneticPill';
import { useAiWordResult } from '../lookup/hooks/useAiWordResult';
import { splitWords } from '../sentence/splitWords';
import { formatRelative } from './relativeTime';

type Props = {
  id: string;
  onBack: () => void;
};

/** 生词详情（6.2）：词条 + AI 词典（收藏时查过，直接命中缓存）+ 全部语境 */
export function WordDetail({ id, onBack }: Props) {
  // undefined = 还在读；null = 已经不存在了（删掉了）
  const [word, setWord] = useState<VocabularyDetail | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    getWordDetail(id)
      .then((detail) => {
        if (alive) setWord(detail);
      })
      .catch((error: unknown) => {
        console.warn('读取生词详情失败', error);
        if (alive) setWord(null);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-xl px-5 py-6">
      <BackButton onBack={onBack} />

      {word === null ? (
        <p className="mt-10 text-center text-callout text-ink-soft">这个生词已经不在了。</p>
      ) : word ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-title font-semibold text-ink">{word.word}</h1>
            <PhoneticPill word={word.word} phonetic={word.phonetic} />
          </div>

          <p className="mt-6 mb-3 text-caption font-medium tracking-wide text-ink-faint">释义</p>
          <DictSection word={word} />

          <p className="mt-6 mb-3 text-caption font-medium tracking-wide text-ink-faint">语境</p>
          <ContextList contexts={word.contexts} />
        </>
      ) : null}
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
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
      返回生词本
    </button>
  );
}

/**
 * AI 词典。收藏时按原形查过（6.1 起点词就请求），这里的请求能命中缓存；
 * 缓存被清过或请求失败时退回收藏时记下的简要释义。
 */
function DictSection({ word }: { word: VocabularyDetail }) {
  const [generation, setGeneration] = useState(0);
  const result = useAiWordResult('aiDictionary', word.word, '', generation);

  if (result.status === 'done') {
    return <AiDictSenses senses={result.data.senses} />;
  }
  if (result.status === 'error') {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-body text-ink-body">{word.briefMeaning}</p>
        <p className="text-caption text-ink-soft">
          词典加载失败，上面是收藏时记下的释义（{result.message}）。
        </p>
        <button
          type="button"
          onClick={() => setGeneration((count) => count + 1)}
          className="self-start text-footnote text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          重新请求词典
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Skeleton width="40%" />
      <Skeleton />
      <Skeleton width="80%" />
    </div>
  );
}

/** 全部语境，新的在前；单词模式下收藏的语境没有句子，不显示空卡片 */
function ContextList({ contexts }: { contexts: VocabularyContext[] }) {
  const withSentence = contexts.filter((context) => context.sentence);
  if (withSentence.length === 0) {
    return <p className="text-callout text-ink-soft">这个词是从单词模式收藏的，没有语境。</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {withSentence.map((context) => (
        <ContextCard key={context.id} context={context} />
      ))}
    </div>
  );
}

function ContextCard({ context }: { context: VocabularyContext }) {
  const target = context.query.toLowerCase();
  return (
    <div className="rounded-card border border-line bg-surface px-3 py-2.5">
      <p className="text-footnote leading-relaxed break-words text-ink-body">
        {splitWords(context.sentence).map((part, index) =>
          part.kind === 'word' && part.text.toLowerCase() === target ? (
            <span key={index} className="text-ink underline decoration-primary underline-offset-2">
              {part.text}
            </span>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </p>
      {context.contextMeaning ? (
        <p className="mt-2 text-callout leading-relaxed break-words text-ink-body">
          {context.contextMeaning}
        </p>
      ) : null}
      <p className="mt-1.5 text-caption text-ink-faint">{formatRelative(context.createdAt)}</p>
    </div>
  );
}
