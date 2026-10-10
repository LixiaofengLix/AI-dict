import type { AiConfig } from '../../types/ai';
import type { PromptKind } from '../../types/settings';

import { getAccent, getAiConfig, getPromptOverrides } from '../settings';
import { aiCache, contextMeaningKey, type PassageKind, wordKey } from './cache';
import { type ChatMessage, chatCompletion } from './client';
import { AiError, describeAiError } from './errors';
import { aiDictionaryMessages, parseAiDictionary } from './prompts/aiDictionary';
import { collocationsMessages, parseCollocations } from './prompts/collocations';
import { contextMeaningMessages } from './prompts/contextMeaning';
import { instructionOf, promptVariant } from './prompts/registry';
import { translateDirection, translateMessages } from './prompts/translate';
import { parseWordCluster, wordClusterMessages } from './prompts/wordCluster';
import type { AiService, GenerateOptions, PassageContext, StreamOptions } from './types';

const TEST_TIMEOUT_MS = 15_000;
/** 讲解、翻译类的文本输出 */
const TEXT_TEMPERATURE = 0.3;
/** 要求返回 JSON 的请求用低温度，格式更稳定 */
const JSON_TEMPERATURE = 0.2;
/** 常见搭配的结果格式变了就换这个值，旧格式的缓存不再命中 */
const COLLOCATIONS_FORMAT = 'forms';

/** 这次请求用的提示词（可改的部分）和对应的缓存区分值 */
async function promptFor(kind: PromptKind) {
  const instruction = instructionOf(await getPromptOverrides(), kind);
  return { instruction, variant: promptVariant(instruction, kind) };
}

function isComplete(config: AiConfig) {
  return Boolean(config.apiKey && config.baseUrl && config.model);
}

async function requireConfig(): Promise<AiConfig> {
  const config = await getAiConfig();
  if (!isComplete(config)) {
    throw new AiError('notConfigured', '还没有配置 AI 服务');
  }
  return config;
}

/** 流式文本：模型常在开头多输出空行，显示前去掉 */
async function streamText(messages: ChatMessage[], options: StreamOptions): Promise<string> {
  const text = await chatCompletion(await requireConfig(), messages, {
    signal: options.signal,
    onText: (partial) => options.onText?.(partial.trimStart()),
    temperature: TEXT_TEMPERATURE,
  });
  return text.trim();
}

async function generateJson(messages: ChatMessage[], options: GenerateOptions) {
  return chatCompletion(await requireConfig(), messages, {
    signal: options.signal,
    temperature: JSON_TEMPERATURE,
  });
}

/** 翻译、语法分析：命中未过期的缓存时一次性给出全文 */
async function cachedPassageText(
  kind: PassageKind,
  input: PassageContext,
  options: StreamOptions,
  messages: () => ChatMessage[],
  variant = '',
): Promise<string> {
  if (!options.refresh) {
    const hit = await aiCache.getPassage(kind, input.text, variant);
    if (hit) {
      options.onText?.(hit);
      return hit;
    }
  }
  const text = await streamText(messages(), options);
  await aiCache.setPassage(kind, input.text, text, variant);
  return text;
}

type WordKind = 'aiDictionary' | 'wordCluster' | 'collocations';

/**
 * 按原形缓存的单词结果。先查"查询词 → 原形"的映射找缓存；
 * 生成后存到结果给出的原形下（没有就用查到的原形），并记下 forms 里的词形都指向这个原形。
 */
async function cachedWordResult<T>(
  kind: WordKind,
  word: string,
  options: GenerateOptions,
  generate: () => Promise<T>,
  describe: (result: T) => { lemma?: string; forms: string[] },
  variant = '',
): Promise<T> {
  const lemma = await aiCache.lemmaOf(word);
  if (!options.refresh) {
    const hit = await aiCache.get<T>(wordKey(kind, lemma, variant));
    if (hit !== undefined) {
      return hit;
    }
  }
  const result = await generate();
  const info = describe(result);
  const target = info.lemma || lemma;
  await aiCache.set(wordKey(kind, target, variant), kind, result);
  await aiCache.rememberLemma([word, ...info.forms], target);
  return result;
}

export const aiImpl: AiService = {
  async isConfigured() {
    return isComplete(await getAiConfig());
  },

  async testConnection(config) {
    if (!/^https?:\/\/\S+$/i.test(config.baseUrl)) {
      return { ok: false, message: 'Base URL 要以 http:// 或 https:// 开头' };
    }
    // 不传 max_tokens：推理模型在很小的上限下只输出思考过程，有的新模型也不认这个参数。
    // 收到第一段内容就说明 Key、地址和模型都可用，直接取消剩下的输出
    const controller = new AbortController();
    let received = false;
    try {
      await chatCompletion(config, [{ role: 'user', content: 'Reply with OK.' }], {
        signal: controller.signal,
        timeoutMs: TEST_TIMEOUT_MS,
        onText: () => {
          received = true;
          controller.abort();
        },
      });
      return { ok: true };
    } catch (error) {
      if (received || (error instanceof AiError && error.kind === 'empty')) {
        return { ok: true };
      }
      return { ok: false, message: describeAiError(error) };
    }
  },

  async contextMeaning({ word, sentence }, options = {}) {
    const { instruction, variant } = await promptFor('contextMeaning');
    const key = contextMeaningKey(sentence, word, variant);
    if (!options.refresh) {
      const hit = await aiCache.get<string>(key);
      if (hit) {
        options.onText?.(hit);
        return hit;
      }
    }
    const text = await streamText(contextMeaningMessages(word, sentence, instruction), options);
    await aiCache.set(key, 'contextMeaning', text);
    return text;
  },

  async aiDictionary({ word, sentence }, options = {}) {
    const accent = await getAccent();
    const { instruction, variant } = await promptFor('aiDictionary');
    return cachedWordResult(
      'aiDictionary',
      word,
      options,
      async () => {
        const messages = aiDictionaryMessages(word, sentence, accent, instruction);
        return parseAiDictionary(await generateJson(messages, options), word);
      },
      (entry) => ({ lemma: entry.word, forms: [] }),
      accent + variant,
    );
  },

  async wordCluster({ word, sentence }, options = {}) {
    const { instruction, variant } = await promptFor('wordCluster');
    return cachedWordResult(
      'wordCluster',
      word,
      options,
      async () => {
        const messages = wordClusterMessages(word, sentence, instruction);
        return parseWordCluster(await generateJson(messages, options), word);
      },
      (cluster) => ({ lemma: cluster.forms[0]?.word, forms: cluster.forms.map((f) => f.word) }),
      variant,
    );
  },

  async collocations({ word, sentence }, options = {}) {
    const { instruction, variant } = await promptFor('collocations');
    return cachedWordResult(
      'collocations',
      word,
      options,
      async () => {
        const messages = collocationsMessages(word, sentence, instruction);
        return parseCollocations(await generateJson(messages, options));
      },
      () => ({ forms: [] }),
      COLLOCATIONS_FORMAT + variant,
    );
  },

  async translate(input, options = {}) {
    // 方向由选中文字本身定（5.1），同一段文字的方向不会变，缓存仍按文字存
    const direction = translateDirection(input.text);
    const { instruction, variant } = await promptFor(
      direction === 'toEnglish' ? 'translateToEnglish' : 'translateToChinese',
    );
    return cachedPassageText(
      'translate',
      input,
      options,
      () => translateMessages(input, direction, instruction),
      variant,
    );
  },

  describeError: describeAiError,
};
