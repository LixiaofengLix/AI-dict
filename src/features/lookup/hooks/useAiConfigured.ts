import { useEffect, useState } from 'react';
import { aiImpl } from '../../../services/ai/impl';

/**
 * 是否已配置 AI 服务；null 表示还在读取。
 * trigger 变化时重新读一次：弹窗每次呼出都要看最新的配置——用户被引导去设置页填完 Key 回来，
 * 弹窗组件（它是常驻的）不能再拿着启动时读到的旧值。
 */
export function useAiConfigured(trigger: number): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    aiImpl
      .isConfigured()
      .then((value) => {
        if (!cancelled) {
          setConfigured(value);
        }
      })
      .catch((error: unknown) => {
        console.warn('读取 AI 配置失败', error);
        if (!cancelled) {
          setConfigured(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [trigger]);

  return configured;
}
