/**
 * 大模型读图（9.4）：让配好的 AI 服务直接看图认字。
 *
 * 和云 OCR 一样只换掉"认字"这一步：图还是 services/ocr 里框选出来的那张，
 * 认出来的行也交给 joinOcrLines 拼成一段、走 5.1 分类；失败（没网、模型不支持图片、
 * 额度用尽）由 services/ocr 降到下一层，所以这里出错直接抛。
 *
 * 复用 AI 配置里的 Base URL 和 API Key，只有模型名是单独填的（默认配的 deepseek 系不看图）。
 * 请求走 OpenAI 的多模态格式（content 是文字 + 图片的数组），图片用 data URL。
 */

import type { AiConfig } from '../types/ai';
import { chatCompletion } from './ai/client';

/**
 * 只认字：不翻译、不解释、不加任何说明。让它保留换行是因为下面按行拆开、交给
 * joinOcrLines 用和系统 OCR 一样的规则拼（英文按空格接、中文不加空格）。
 */
const SYSTEM_PROMPT =
  '你是 OCR 工具，只把图片里的文字原样输出：保留原有的换行，不翻译、不解释、不加任何说明。';

/**
 * 用视觉模型认出图里的各行文字（从上到下）；没认出字返回空数组。
 * 图是 services/ocr 里框选出来的 PNG base64，ai 里带着 Base URL 和 API Key。
 */
export async function recognizeWithVision(
  image: string,
  ai: AiConfig,
  model: string,
): Promise<string[]> {
  const text = await chatCompletion(
    { ...ai, model },
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: '把这张图里的文字原样输出。' },
          // 截图命令给的是 PNG 的 base64，按 OpenAI 的 data URL 格式塞进去
          { type: 'image_url', image_url: { url: `data:image/png;base64,${image}` } },
        ],
      },
    ],
    // 认字不该带发挥：温度 0；思考参数不发（见 client.ts 的 thinking）
    { temperature: 0, thinking: false },
  );
  return text.split('\n');
}
