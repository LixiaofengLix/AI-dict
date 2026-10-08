import { useEffect, useState } from 'react';
import { aiImpl } from '../../../services/ai/impl';
import type { AiDictEntry, Collocation, WordCluster } from '../../../types/ai';

type Results = {
  aiDictionary: AiDictEntry;
  wordCluster: WordCluster;
  collocations: Collocation[];
};

export type AiWordKind = keyof Results;

/** error 的 message 是给用户看的中文原因 */
export type AiResult<T> =
  { status: 'loading' } | { status: 'done'; data: T } | { status: 'error'; message: string };

/**
 * 单词的 AI 结果（AI 词典 / 单词簇 / 常见搭配）。
 * generation 每加 1 就跳过缓存重新生成一次，新结果回来前显示加载状态。
 */
export function useAiWordResult<K extends AiWordKind>(
  kind: K,
  word: string,
  sentence: string,
  generation: number,
): AiResult<Results[K]> {
  const requestKey = JSON.stringify([kind, word, sentence, generation]);
  const [settled, setSettled] = useState<{ key: string; result: AiResult<Results[K]> } | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    const key = JSON.stringify([kind, word, sentence, generation]);
    aiImpl[kind]({ word, sentence }, { signal: controller.signal, refresh: generation > 0 })
      .then((data) => setSettled({ key, result: { status: 'done', data: data as Results[K] } }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn(`AI ${kind} 失败`, error);
          setSettled({ key, result: { status: 'error', message: aiImpl.describeError(error) } });
        }
      });
    return () => controller.abort();
  }, [kind, word, sentence, generation]);

  return settled?.key === requestKey ? settled.result : { status: 'loading' };
}
