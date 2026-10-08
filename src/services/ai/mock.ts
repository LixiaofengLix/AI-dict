import {
  mockAiConfig,
  mockAiDictEntries,
  mockCollocations,
  mockContextMeaning,
  mockLemma,
  mockTranslation,
  mockWordClusters,
} from './mocks';
import type { AiDictEntry, Collocation, WordCluster } from '../../types/ai';

import { describeAiError } from './errors';
import { mockLatency } from './mockLatency';
import type { AiService, StreamOptions } from './types';

const FIRST_TOKEN_MS = 600;
const CHUNK_INTERVAL_MS = 40;

/** 模拟流式输出：先等待首包，再每次吐出 1–4 个字符 */
async function streamText(full: string, options: StreamOptions = {}): Promise<string> {
  const { onText, signal } = options;
  await mockLatency(FIRST_TOKEN_MS, signal);
  let end = 0;
  while (end < full.length) {
    end = Math.min(full.length, end + 1 + Math.floor(Math.random() * 4));
    onText?.(full.slice(0, end));
    await mockLatency(CHUNK_INTERVAL_MS, signal);
  }
  return full;
}

const DICT_LATENCY_MS = 1200;

function fallbackAiDictEntry(word: string): AiDictEntry {
  return {
    word,
    phonetic: null,
    tags: [],
    senses: [
      {
        pos: '',
        meaning: `（mock）"${word}" 的中文释义`,
        definition: `(mock) English definition of "${word}"`,
        example: `This is an example sentence with "${word}".`,
        exampleTranslation: `这是一个包含"${word}"的例句。`,
      },
    ],
  };
}

function fallbackWordCluster(word: string): WordCluster {
  return {
    forms: [{ label: '原形', word }],
    family: [
      {
        word: `${word}ness`,
        pos: 'n.',
        meaning: `（mock）${word} 的派生词`,
        example: `This is an example with "${word}ness".`,
        exampleTranslation: `这是一个包含"${word}ness"的例句。`,
      },
    ],
    confusables: [],
  };
}

function fallbackCollocations(word: string): Collocation[] {
  return [
    {
      phrase: `${word} up`,
      forms: [`${word} up`],
      meaning: `（mock）${word} 的常见搭配`,
      example: `This is an example with "${word} up".`,
      exampleTranslation: `这是一个包含"${word} up"的例句。`,
    },
  ];
}

export const aiMock: AiService = {
  async isConfigured() {
    // mock 模式下不看真实配置：mockAiConfig 里有假 Key，界面能直接看到 AI 结果
    const { apiKey, baseUrl, model } = mockAiConfig;
    return Boolean(apiKey && baseUrl && model);
  },

  async testConnection(config) {
    await mockLatency(800);
    if (!config.baseUrl.startsWith('http')) {
      return { ok: false, message: 'Base URL 格式不正确' };
    }
    if (!config.apiKey.startsWith('sk-')) {
      return { ok: false, message: 'API Key 无效（401 Unauthorized）' };
    }
    return { ok: true };
  },

  contextMeaning({ word, sentence }, options) {
    return streamText(mockContextMeaning(word, sentence), options);
  },

  async aiDictionary({ word }, options) {
    await mockLatency(DICT_LATENCY_MS, options?.signal);
    return mockAiDictEntries[mockLemma(word)] ?? fallbackAiDictEntry(word);
  },

  async wordCluster({ word }, options) {
    await mockLatency(DICT_LATENCY_MS, options?.signal);
    return mockWordClusters[mockLemma(word)] ?? fallbackWordCluster(word);
  },

  async collocations({ word }, options) {
    await mockLatency(DICT_LATENCY_MS, options?.signal);
    return mockCollocations[mockLemma(word)] ?? fallbackCollocations(word);
  },

  translate({ text }, options) {
    return streamText(mockTranslation(text), options);
  },

  describeError: describeAiError,
};
