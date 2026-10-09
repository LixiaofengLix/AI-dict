import { useCallback, useEffect, useState } from 'react';
import { isStarred, star, unstar, type StarDetails } from '../../../services/vocabulary';

/**
 * 这个词在当前这句话里的收藏状态（6.1）。
 * details 为 null（AI 词典还没加载出来）时状态未知，星标禁用——查状态和写入都要原形。
 * 每次挂载重新读一次：在生词本（6.2）里删过的词，回到词卡时状态是对的。
 */
export function useStarred(details: StarDetails | null, sentence: string) {
  const word = details?.word ?? null;
  const requestKey = word === null ? null : JSON.stringify([word, sentence]);
  // 存 {key, starred} 而不是直接存状态：换词后 key 对不上自然就是"未知"，
  // 不用在 effect 里同步 setState 重置
  const [settled, setSettled] = useState<{ key: string; starred: boolean } | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (word === null || requestKey === null) {
      return;
    }
    let alive = true;
    isStarred(word, sentence)
      .then((value) => {
        if (alive) setSettled({ key: requestKey, starred: value });
      })
      .catch((error: unknown) => {
        console.warn('读取收藏状态失败', error);
      });
    return () => {
      alive = false;
    };
  }, [word, sentence, requestKey]);

  // null 表示状态未知（词典没好、还在读、或读失败）
  const starred = requestKey !== null && settled?.key === requestKey ? settled.starred : null;

  const toggle = useCallback(async () => {
    if (!details || requestKey === null || starred === null || pending) {
      return;
    }
    setPending(true);
    try {
      if (starred) {
        await unstar(details.word, sentence);
      } else {
        await star(details);
      }
      setSettled({ key: requestKey, starred: !starred });
    } catch (error) {
      // 失败保持原状态，用户可以再点一次
      console.warn('收藏生词失败', error);
    } finally {
      setPending(false);
    }
  }, [details, requestKey, starred, pending, sentence]);

  return { starred, pending, toggle };
}
