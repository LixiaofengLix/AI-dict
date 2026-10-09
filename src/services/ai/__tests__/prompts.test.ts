import { describe, expect, it } from 'vitest';
import { AiError } from '../errors';
import { aiDictionaryMessages, parseAiDictionary } from '../prompts/aiDictionary';
import { contextMeaningMessages } from '../prompts/contextMeaning';
import { parseCollocations } from '../prompts/collocations';
import { extractJsonObject } from '../prompts/json';
import { passageBlock } from '../prompts/passage';
import { TRANSLATION_HEADINGS, translateDirection, translateMessages } from '../prompts/translate';
import { parseWordCluster } from '../prompts/wordCluster';

const SENSE = {
  pos: 'v.',
  meaning: '去；走',
  definition: 'to move from one place to another',
  example: 'I went home.',
  exampleTranslation: '我回家了。',
};

describe('extractJsonObject', () => {
  it('去掉代码块和前后说明', () => {
    expect(extractJsonObject('好的：\n```json\n{"a": 1}\n```\n以上。')).toEqual({ a: 1 });
  });

  it('不是 JSON 时报 format', () => {
    for (const text of ['抱歉，我不知道', '{"a": ', '[1, 2]']) {
      const error = (() => {
        try {
          extractJsonObject(text);
        } catch (e) {
          return e;
        }
      })();
      expect(error).toBeInstanceOf(AiError);
      expect(error).toMatchObject({ kind: 'format' });
    }
  });
});

describe('aiDictionaryMessages', () => {
  it('带上查询词、原句和口音', () => {
    const us = aiDictionaryMessages('went', 'I went to my medical man.', 'us');
    const user = us[us.length - 1].content;
    expect(user).toContain('查询的词：went');
    expect(user).toContain('I went to my medical man.');
    expect(user).toContain('美式');
    const uk = aiDictionaryMessages('went', '', 'uk');
    expect(uk[uk.length - 1].content).toContain('英式');
    expect(uk[uk.length - 1].content).not.toContain('出现的原句');
  });
});

describe('parseAiDictionary', () => {
  it('went 返回原形 go', () => {
    const entry = parseAiDictionary(
      JSON.stringify({ word: 'go', phonetic: '/ɡoʊ/', tags: ['四级'], senses: [SENSE] }),
      'went',
    );
    expect(entry).toEqual({ word: 'go', phonetic: 'ɡoʊ', tags: ['四级'], senses: [SENSE] });
  });

  it('缺字段用空值补上，原形缺失时用查询词', () => {
    const entry = parseAiDictionary(JSON.stringify({ senses: [{ meaning: '去' }] }), 'go');
    expect(entry).toEqual({
      word: 'go',
      phonetic: null,
      tags: [],
      senses: [{ pos: '', meaning: '去', definition: '', example: '', exampleTranslation: '' }],
    });
  });

  it('只保留认识的考试标签，去重', () => {
    const entry = parseAiDictionary(
      JSON.stringify({ word: 'go', tags: ['四级', 'CET-4', '四级', 'GRE', 3], senses: [SENSE] }),
      'go',
    );
    expect(entry.tags).toEqual(['四级', 'GRE']);
  });

  it('丢掉没有中文释义的条目，全部无效时报 format', () => {
    const entry = parseAiDictionary(
      JSON.stringify({ word: 'go', senses: [{ pos: 'v.' }, 'bad', SENSE] }),
      'go',
    );
    expect(entry.senses).toEqual([SENSE]);
    expect(() => parseAiDictionary(JSON.stringify({ word: 'go', senses: [] }), 'go')).toThrow(
      AiError,
    );
  });
});

describe('parseWordCluster', () => {
  const related = (word: string) => ({
    word,
    pos: 'adj.',
    meaning: '外向的',
    example: `He is ${word}.`,
    exampleTranslation: '他很外向。',
  });

  it('变形按固定顺序排列，丢掉不认识的标签，原形放第一个', () => {
    const cluster = parseWordCluster(
      JSON.stringify({
        forms: [
          { label: '过去式', word: 'went' },
          { label: '原形', word: 'go' },
          { label: '将来时', word: 'will go' },
          { label: '过去式', word: 'goed' },
          { label: '现在分词', word: 'going' },
        ],
        family: [],
        confusables: [],
      }),
      'went',
    );
    expect(cluster.forms).toEqual([
      { label: '原形', word: 'go' },
      { label: '过去式', word: 'went' },
      { label: '现在分词', word: 'going' },
    ]);
  });

  it('没有原形时用查询词补上', () => {
    const cluster = parseWordCluster(JSON.stringify({ forms: [], family: [] }), 'the');
    expect(cluster).toEqual({
      forms: [{ label: '原形', word: 'the' }],
      family: [],
      confusables: [],
    });
  });

  it('同根词、易混词去重，去掉和原形相同的词和缺中文的项', () => {
    const cluster = parseWordCluster(
      JSON.stringify({
        forms: [{ label: '原形', word: 'go' }],
        family: [related('outgoing'), related('Outgoing'), related('go'), { word: 'ongoing' }],
        confusables: [
          { word: 'come', meaning: '来', difference: '方向相反' },
          { word: 'leave', meaning: '' },
        ],
      }),
      'go',
    );
    expect(cluster.family).toEqual([related('outgoing')]);
    expect(cluster.confusables).toEqual([
      { word: 'come', meaning: '来', difference: '方向相反', example: '', exampleTranslation: '' },
    ]);
  });

  it('三组字段都没有时报 format', () => {
    expect(() => parseWordCluster(JSON.stringify({ word: 'go' }), 'go')).toThrow(AiError);
  });
});

describe('parseCollocations', () => {
  const item = {
    phrase: 'go off',
    meaning: '（闹钟）响',
    example: 'My alarm went off.',
    exampleTranslation: '闹钟响了。',
  };

  it('取出搭配列表，按词组去重，丢掉缺中文的项', () => {
    expect(
      parseCollocations(
        JSON.stringify({
          collocations: [item, { ...item, phrase: 'Go off' }, { phrase: 'go on' }, 'bad'],
        }),
      ),
    ).toEqual([{ ...item, forms: ['go off'] }]);
  });

  it('词形统一小写、去重，phrase 本身排第一', () => {
    const [parsed] = parseCollocations(
      JSON.stringify({
        collocations: [
          { ...item, phrase: 'Go off', forms: ['Went  off', 'go off', 3, 'goes off'] },
        ],
      }),
    );
    expect(parsed.forms).toEqual(['go off', 'went off', 'goes off']);
  });

  it('空数组是正常结果，没有 collocations 字段报 format', () => {
    expect(parseCollocations('{"collocations": []}')).toEqual([]);
    expect(() => parseCollocations('{"items": []}')).toThrow(AiError);
  });
});

describe('contextMeaningMessages', () => {
  const messagesFor = (word: string, sentence: string) => {
    const messages = contextMeaningMessages(word, sentence);
    return messages[messages.length - 1].content;
  };

  it('带上原句和单词，要求以"这个词在这里指"开头', () => {
    const user = messagesFor('off', 'The alarm went off just as I was about to leave.');

    expect(user).toContain('The alarm went off just as I was about to leave.');
    expect(user).toContain('off 在这里指');
  });

  it('是短语的一部分时要写出完整短语并解释整体意思', () => {
    const user = messagesFor('off', 'The alarm went off just as I was about to leave.');

    expect(user).toContain('短语动词');
    expect(user).toContain('go off');
    expect(user).toContain('写出完整短语');
  });
});

describe('translateMessages', () => {
  const input = {
    text: 'I was a hospital in myself.',
    before: 'I had walked into that reading-room a happy, healthy man.',
    after: 'Students would have no need to walk the hospitals.',
  };
  const chinese = { text: '我差点迟到。', before: '', after: '' };

  it('上下文放在选中内容前后，没有上下文时省略', () => {
    const messages = translateMessages(input, 'toChinese');
    const user = messages[messages.length - 1].content;
    expect(user.indexOf('【上文】')).toBeLessThan(user.indexOf('【选中的内容】'));
    expect(user.indexOf('【选中的内容】')).toBeLessThan(user.indexOf('【下文】'));

    const bare = passageBlock({ ...input, before: '', after: '' });
    expect(bare).toBe('【选中的内容】\nI was a hospital in myself.');
  });

  it('英译中：要中文翻译和句意解释两节，标题就是界面按它解析的那两个', () => {
    const messages = translateMessages(input, 'toChinese');
    expect(messages[0].content).toContain('英译中');
    const translate = messages[messages.length - 1].content;
    expect(translate).toContain(`## ${TRANSLATION_HEADINGS.toChinese[0]}`);
    expect(translate).toContain(`## ${TRANSLATION_HEADINGS.toChinese[1]}`);
    expect(translate).not.toContain('## 语法要点');
  });

  it('中译英：换一套说法，要英文翻译，不是逐字直译', () => {
    const messages = translateMessages(chinese, 'toEnglish');
    expect(messages[0].content).toContain('中译英');
    const translate = messages[messages.length - 1].content;
    expect(translate).toContain('【选中的内容】\n我差点迟到。');
    expect(translate).toContain(`## ${TRANSLATION_HEADINGS.toEnglish[0]}`);
    expect(translate).toContain(`## ${TRANSLATION_HEADINGS.toEnglish[1]}`);
    expect(translate).toContain('地道的英文');
    expect(translate).not.toContain('## 中文翻译');
  });
});

describe('translateDirection', () => {
  it('主要是中文的走中译英，其余走英译中', () => {
    expect(translateDirection('我差点迟到。')).toBe('toEnglish');
    expect(translateDirection('他说这张 photo 很好看')).toBe('toEnglish');
    expect(translateDirection('I was a hospital in myself.')).toBe('toChinese');
    expect(translateDirection("It's not my cup of tea.")).toBe('toChinese');
  });
});
