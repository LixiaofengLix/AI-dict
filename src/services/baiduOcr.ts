/**
 * 百度高精度云 OCR（9.3）：把截图交给百度「文字识别」认字。
 *
 * 只换掉"认字"这一步：图还是 services/ocr 里框选出来的那张，认出来的行也照样交给
 * joinOcrLines 拼成一段、走 5.1 分类。失败（没网、Key 错、额度用尽、图太大）由
 * services/ocr 回退到系统 OCR，所以这里出错直接抛。
 *
 * 接口和 pot 的 baidu_accurate 是同一套：先拿 oauth/2.0/token 换 access_token（30 天有效，
 * 缓存在 settings 里，见 getBaiduToken），再拿它请求 accurate_basic。
 */

import { fetch } from '@tauri-apps/plugin-http';
import type { BaiduToken, OcrConfig } from '../types/settings';
import { clearBaiduToken, getBaiduToken, setBaiduToken } from './settings';

const TOKEN_URL = 'https://aip.baidubce.com/oauth/2.0/token';

/** 高精度版，不带文字位置。比通用版准，免费额度也少一些 */
const OCR_URL = 'https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic';

/** 百度没返回 expires_in 时按它自己的 30 天算 */
const DEFAULT_EXPIRES_IN = 30 * 24 * 60 * 60;

/** 一条请求最多等这么久：卡住时降回系统 OCR，别让弹窗一直不出来 */
const TIMEOUT_MS = 15_000;

/** 带超时的 fetch（插件的 fetch 支持标准的 signal） */
async function request(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** 读出 JSON 响应体；HTTP 不成功或body 不是 JSON 都抛错，错误信息里带上原文片段 */
async function readJson<T>(response: Response, what: string): Promise<T> {
  const text = await response.text().catch(() => '');
  if (!response.ok) {
    throw new Error(`${what}（HTTP ${response.status}）${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${what}：返回的不是 JSON`);
  }
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/**
 * 换一个 access_token。默认先用 settings 里的缓存（30 天有效）；
 * force 为真时跳过缓存——服务端提前把它作废时（错误码 110/111）用。
 */
async function accessToken(config: OcrConfig, force = false): Promise<string> {
  if (!force) {
    const cached = await getBaiduToken();
    if (cached) {
      return cached.token;
    }
  }

  const query = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.baiduApiKey.trim(),
    client_secret: config.baiduSecretKey.trim(),
  });
  const response = await request(`${TOKEN_URL}?${query}`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  // Key 不对时也是 HTTP 200，错误在 body 的 error / error_description 里
  const body = await readJson<TokenResponse>(response, '换取百度 access_token 失败');
  if (!body.access_token) {
    throw new Error(
      `换取百度 access_token 失败：${body.error_description || body.error || '没有返回 token'}`,
    );
  }

  const token: BaiduToken = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? DEFAULT_EXPIRES_IN) * 1000,
  };
  await setBaiduToken(token);
  return token.token;
}

interface OcrResponse {
  words_result?: { words?: string }[];
  error_code?: number;
  error_msg?: string;
}

/** 百度返回的业务错误：HTTP 200，错误码在 body 里（额度用尽、图太大等） */
class BaiduError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'BaiduError';
  }
}

/** 110 token 无效、111 token 过期：缓存的不算数了，换一个新的重试一次即可，别为这个降层 */
const TOKEN_ERROR_CODES = new Set([110, 111]);

/**
 * 用百度高精度云 OCR 认出图里的各行文字（从上到下）；没认出字返回空数组。
 * 图是 services/ocr 里框选出来的 PNG base64。
 */
export async function recognizeWithBaidu(image: string, config: OcrConfig): Promise<string[]> {
  const run = async (token: string): Promise<string[]> => {
    const response = await request(`${OCR_URL}?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      // CHN_ENG 是中英混排，正好是本应用的范围（服务端默认也是它，写出来更清楚）
      body: new URLSearchParams({ image, language_type: 'CHN_ENG' }).toString(),
    });
    const body = await readJson<OcrResponse>(response, '云 OCR 请求失败');
    if (body.error_code) {
      throw new BaiduError(body.error_code, body.error_msg || `错误码 ${body.error_code}`);
    }
    return (body.words_result ?? []).map((line) => line.words ?? '');
  };

  try {
    return await run(await accessToken(config));
  } catch (error) {
    if (!(error instanceof BaiduError) || !TOKEN_ERROR_CODES.has(error.code)) {
      throw error;
    }
    // 缓存里的 token 已经不作数了，先删掉再换一个（下次调用就不用再白试一遍）
    await clearBaiduToken();
    return await run(await accessToken(config, true));
  }
}
