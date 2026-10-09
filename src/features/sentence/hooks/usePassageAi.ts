import { useEffect, useState } from 'react';
import { aiImpl } from '../../../services/ai/impl';

/**
 * text 为 null 表示首包还没到；done 表示输出结束（成功或失败）；
 * error 是给用户看的中文原因，中途失败时 text 保留已经输出的部分
 */
export type PassageResult = { text: string | null; done: boolean; error: string | null };

const PENDING: PassageResult = { text: null, done: false, error: null };

/**
 * 翻译，流式更新（DEV_PLAN 5.1）。generation 每加 1 就跳过缓存重新生成一次；
 * retry 在失败后重新请求一次（失败的结果不会进缓存，不需要跳过缓存）。
 */
export function usePassageAi(text: string, generation: number) {
  const [attempt, setAttempt] = useState(0);
  const requestKey = JSON.stringify([text, generation, attempt]);
  const [current, setCurrent] = useState<{ key: string; result: PassageResult } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const key = JSON.stringify([text, generation, attempt]);
    let latest: string | null = null;
    // 选区前后的上下文还没取——"自动获取语境"在后续迭代里，先留空
    aiImpl
      .translate(
        { text, before: '', after: '' },
        {
          signal: controller.signal,
          refresh: generation > 0,
          onText: (partial) => {
            latest = partial;
            setCurrent({ key, result: { text: partial, done: false, error: null } });
          },
        },
      )
      .then((full) => setCurrent({ key, result: { text: full, done: true, error: null } }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn('翻译失败', error);
          setCurrent({
            key,
            result: { text: latest, done: true, error: aiImpl.describeError(error) },
          });
        }
      });
    return () => controller.abort();
  }, [text, generation, attempt]);

  return {
    ...(current?.key === requestKey ? current.result : PENDING),
    retry: () => setAttempt((n) => n + 1),
  };
}
