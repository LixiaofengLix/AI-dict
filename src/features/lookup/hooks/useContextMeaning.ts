import { useEffect, useState } from 'react';
import { aiImpl } from '../../../services/ai/impl';

/** error 是给用户看的中文原因；中途失败时 text 保留已经输出的部分 */
export type ContextMeaning = { text: string | null; error: string | null };

const PENDING: ContextMeaning = { text: null, error: null };

/**
 * AI 语境释义（这个词在这句话里是什么意思），流式更新；text 为 null 表示首包还没到。
 * generation 每加 1 就跳过缓存重新生成一次——失败重试也走它（失败的结果不会进缓存）。
 * 句子为空（单词模式，4.2）时不请求：没有语境可解释。
 */
export function useContextMeaning(
  word: string,
  sentence: string,
  generation: number,
): ContextMeaning {
  const requestKey = JSON.stringify([word, sentence, generation]);
  const [current, setCurrent] = useState<{ key: string; state: ContextMeaning } | null>(null);

  useEffect(() => {
    if (!sentence) {
      return;
    }
    const controller = new AbortController();
    const key = JSON.stringify([word, sentence, generation]);
    let latest: string | null = null;
    const setText = (text: string) => {
      latest = text;
      setCurrent({ key, state: { text, error: null } });
    };
    aiImpl
      .contextMeaning(
        { word, sentence },
        { signal: controller.signal, refresh: generation > 0, onText: setText },
      )
      .then(setText)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn('语境释义失败', error);
          setCurrent({ key, state: { text: latest, error: aiImpl.describeError(error) } });
        }
      });
    return () => controller.abort();
  }, [word, sentence, generation]);

  return current?.key === requestKey ? current.state : PENDING;
}
