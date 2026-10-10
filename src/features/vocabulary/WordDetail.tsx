import { useEffect, useState } from 'react';
import { SectionLabel } from '../../components/SectionLabel';
import { Skeleton } from '../../components/Skeleton';
import { CAPTION, CARD, wordTitleClass } from '../../components/styles';
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

/** 生词详情（6.2，样张 11 右栏）：词条 + AI 词典（收藏时查过，直接命中缓存）+ 全部语境 */
export function WordDetail({ id }: { id: string }) {
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

  if (word === null) {
    return <p className={`mt-10 text-center ${CAPTION}`}>这个生词已经不在了。</p>;
  }
  if (!word) return null;

  const contexts = word.contexts.filter((context) => context.sentence);
  return (
    <>
      <div className="flex items-center gap-2">
        <h2 className={wordTitleClass(true)}>
          {word.word}
          <PhoneticPill word={word.word} phonetic={word.phonetic} />
        </h2>
      </div>

      <SectionLabel title="AI 词典" className="mt-5" />
      <DictSection word={word} />

      <SectionLabel title={`全部语境 · ${contexts.length}`} className="mt-5" />
      <ContextList contexts={contexts} />
    </>
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
    return (
      <div className={CARD.plain}>
        <AiDictSenses senses={result.data.senses} examples={false} />
      </div>
    );
  }
  if (result.status === 'error') {
    return (
      <div className={`flex flex-col gap-1.5 ${CARD.plain}`}>
        <p className="text-body font-semibold text-ink">{word.briefMeaning}</p>
        <p className={CAPTION}>词典加载失败，上面是收藏时记下的释义（{result.message}）。</p>
        <button
          type="button"
          onClick={() => setGeneration((count) => count + 1)}
          className="self-start text-footnote font-bold text-primary hover:underline"
        >
          重新请求词典
        </button>
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-2 ${CARD.plain}`}>
      <Skeleton width="40%" />
      <Skeleton />
      <Skeleton width="80%" />
    </div>
  );
}

/** 全部语境，新的在前；单词模式下收藏的语境没有句子，不显示空卡片 */
function ContextList({ contexts }: { contexts: VocabularyContext[] }) {
  if (contexts.length === 0) {
    return <p className={`ml-0.5 ${CAPTION}`}>这个词是从单词模式收藏的，没有语境。</p>;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {contexts.map((context) => (
        <ContextCard key={context.id} context={context} />
      ))}
    </div>
  );
}

/** 一条语境（样张 11）：原句里查的词青绿淡底，下面青绿竖线引出语境释义，最后是时间 */
function ContextCard({ context }: { context: VocabularyContext }) {
  const target = context.query.toLowerCase();
  return (
    <div className={CARD.plain}>
      <p className="text-footnote leading-[1.7] break-words text-ink-body">
        {splitWords(context.sentence).map((part, index) =>
          part.kind === 'word' && part.text.toLowerCase() === target ? (
            <em key={index} className="rounded-[4px] bg-mint-soft px-[3px] text-ink not-italic">
              {part.text}
            </em>
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </p>
      {context.contextMeaning ? (
        <p className="mt-2 border-l-[3px] border-mint py-0.5 pl-2.5 text-footnote leading-[1.65] break-words text-ink-body">
          {context.contextMeaning}
        </p>
      ) : null}
      <p className={`mt-1.5 ${CAPTION}`}>{formatRelative(context.createdAt)}</p>
    </div>
  );
}
