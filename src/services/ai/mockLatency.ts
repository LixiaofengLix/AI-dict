import { delay } from '../../utils/async';

/** mock 实现统一的模拟延迟 */
export const MOCK_LATENCY_MS = 200;

export function mockLatency(ms = MOCK_LATENCY_MS, signal?: AbortSignal): Promise<void> {
  return delay(ms, signal);
}
