import { useCallback } from 'react';
import { getAccent } from '../../../services/settings';
import { speak } from '../../../services/speech';

/** 按设置里的口音朗读；每次都读最新设置，设置页改了立即生效 */
export function useSpeak() {
  return useCallback((text: string) => {
    getAccent()
      .then((accent) => speak(text, accent))
      .catch((error: unknown) => console.warn('发音失败', error));
  }, []);
}
