import type { AiDictEntry, Collocation, WordCluster } from '../../../types/ai';

/** 变形词 → 原形，用于演示 AI 返回原形（went → go、magazines → magazine） */
const LEMMAS: Record<string, string> = {
  went: 'go',
  gone: 'go',
  goes: 'go',
  going: 'go',
  magazines: 'magazine',
  fortunes: 'fortune',
};

export function mockLemma(word: string): string {
  const normalized = word.trim().toLowerCase();
  return LEMMAS[normalized] ?? normalized;
}

/** 以单词原形（小写）为 key；单词出自 mock 第 1 章和《傲慢与偏见》开头 */
export const mockAiDictEntries: Record<string, AiDictEntry> = {
  extraordinary: {
    word: 'extraordinary',
    phonetic: 'ɪkˈstrɔːdnri',
    senses: [
      {
        pos: 'adj.',
        meaning: '非凡的；卓越的',
        definition: 'much greater or better than is usual',
        example: 'She is a woman of extraordinary talent.',
        exampleTranslation: '她是一位才华非凡的女性。',
      },
      {
        pos: 'adj.',
        meaning: '离奇的；令人惊讶的',
        definition: 'very unusual or strange and surprising',
        example: 'What an extraordinary thing to say!',
        exampleTranslation: '说出这种话真是太离奇了！',
      },
      {
        pos: 'adj.',
        meaning: '特别的；临时的（会议等）',
        definition: 'arranged for a special purpose, in addition to what normally happens',
        example: 'An extraordinary meeting was held to discuss the matter.',
        exampleTranslation: '为讨论此事召开了一次特别会议。',
      },
    ],
  },
  magazine: {
    word: 'magazine',
    phonetic: 'ˌmæɡəˈziːn',
    senses: [
      {
        pos: 'n.',
        meaning: '杂志；期刊',
        definition:
          'a type of large thin book with a paper cover that is published every week or month',
        example: 'I read a fashion magazine on the train.',
        exampleTranslation: '我在火车上读了一本时尚杂志。',
      },
      {
        pos: 'n.',
        meaning: '（电视、广播的）杂志节目',
        definition: 'a television or radio programme that covers a series of different topics',
        example: 'She presents a weekly arts magazine on the radio.',
        exampleTranslation: '她在电台主持一档每周艺术杂志节目。',
      },
      {
        pos: 'n.',
        meaning: '弹匣；弹药库',
        definition: 'the part of a gun that holds the bullets; a store for weapons and explosives',
        example: 'He loaded a fresh magazine into the rifle.',
        exampleTranslation: '他给步枪装上了新弹匣。',
      },
    ],
  },
  seedy: {
    word: 'seedy',
    phonetic: 'ˈsiːdi',
    senses: [
      {
        pos: 'adj.',
        meaning: '（口语，旧）身体不适的；没精神的',
        definition: 'slightly ill; not feeling well',
        example: 'I was feeling a bit seedy after the long journey.',
        exampleTranslation: '长途旅行之后我觉得有点不舒服。',
      },
      {
        pos: 'adj.',
        meaning: '破旧的；肮脏的',
        definition: 'dirty and unpleasant, possibly connected with immoral or illegal activities',
        example: 'They stayed in a seedy hotel near the station.',
        exampleTranslation: '他们住在车站附近一家破旧的旅馆。',
      },
      {
        pos: 'adj.',
        meaning: '名声不好的；下流的',
        definition: 'having a bad reputation; sordid',
        example: 'The film shows the seedy side of city life.',
        exampleTranslation: '这部电影展现了城市生活中不光彩的一面。',
      },
    ],
  },
  go: {
    word: 'go',
    phonetic: 'ɡəʊ',
    senses: [
      {
        pos: 'v.',
        meaning: '去；走',
        definition: 'to move or travel from one place to another',
        example: 'I went to my doctor last week.',
        exampleTranslation: '我上周去看了医生。',
      },
      {
        pos: 'v.',
        meaning: '离开；走开',
        definition: 'to leave a place',
        example: "It's late. I have to go.",
        exampleTranslation: '很晚了，我得走了。',
      },
      {
        pos: 'v.',
        meaning: '变得；变成',
        definition: 'to become different in a particular way, especially a bad way',
        example: 'Her hair is going grey.',
        exampleTranslation: '她的头发渐渐白了。',
      },
      {
        pos: 'v.',
        meaning: '进展；进行',
        definition: 'used to talk about how well or badly something happens',
        example: 'How did the interview go?',
        exampleTranslation: '面试进行得怎么样？',
      },
      {
        pos: 'v.',
        meaning: '运转；工作',
        definition: 'to work or function correctly',
        example: "The car won't go.",
        exampleTranslation: '汽车发动不起来了。',
      },
      {
        pos: 'n.',
        meaning: '尝试；轮到的机会',
        definition: 'an attempt to do something; a turn in a game',
        example: 'Let me have a go.',
        exampleTranslation: '让我试试。',
      },
    ],
  },
  fortune: {
    word: 'fortune',
    phonetic: 'ˈfɔːtʃuːn',
    senses: [
      {
        pos: 'n.',
        meaning: '财富；大笔的钱',
        definition: 'a large amount of money',
        example: 'He made a fortune in the property market.',
        exampleTranslation: '他在房地产市场上发了大财。',
      },
      {
        pos: 'n.',
        meaning: '运气；机会',
        definition: 'chance or luck, especially in the way it affects people’s lives',
        example: 'I had the good fortune to meet her.',
        exampleTranslation: '我有幸结识了她。',
      },
      {
        pos: 'n.',
        meaning: '命运',
        definition: 'what will happen to somebody in the future',
        example: 'She used to tell fortunes at the fair.',
        exampleTranslation: '她以前在集市上给人算命。',
      },
    ],
  },
};

export const mockWordClusters: Record<string, WordCluster> = {
  go: {
    forms: [
      { label: '原形', word: 'go' },
      { label: '第三人称单数', word: 'goes' },
      { label: '过去式', word: 'went' },
      { label: '过去分词', word: 'gone' },
      { label: '现在分词', word: 'going' },
    ],
    family: [
      {
        word: 'goer',
        pos: 'n.',
        meaning: '常去某处的人',
        example: 'She is a regular theatre-goer.',
        exampleTranslation: '她是剧院的常客。',
      },
      {
        word: 'outgoing',
        pos: 'adj.',
        meaning: '外向的；即将离任的',
        example: 'He is friendly and outgoing.',
        exampleTranslation: '他友好又外向。',
      },
      {
        word: 'ongoing',
        pos: 'adj.',
        meaning: '进行中的',
        example: 'The investigation is still ongoing.',
        exampleTranslation: '调查仍在进行中。',
      },
      {
        word: 'forgo',
        pos: 'v.',
        meaning: '放弃；弃绝',
        example: 'She decided to forgo her holiday this year.',
        exampleTranslation: '她决定今年不休假了。',
      },
    ],
    confusables: [
      {
        word: 'come',
        meaning: '来',
        difference: 'go 是离开说话人所在的地方，come 是朝说话人所在的地方来',
        example: 'Come here! — I have to go now.',
        exampleTranslation: '过来！——我现在得走了。',
      },
      {
        word: 'leave',
        meaning: '离开',
        difference: 'leave 强调离开某地，后面直接跟地点；go 强调去往某处，常接 to',
        example: 'We left London and went to Oxford.',
        exampleTranslation: '我们离开伦敦，去了牛津。',
      },
    ],
  },
  seedy: {
    forms: [
      { label: '原形', word: 'seedy' },
      { label: '比较级', word: 'seedier' },
      { label: '最高级', word: 'seediest' },
    ],
    family: [
      {
        word: 'seed',
        pos: 'n.',
        meaning: '种子',
        example: 'Plant the seeds in spring.',
        exampleTranslation: '春天播种。',
      },
      {
        word: 'seediness',
        pos: 'n.',
        meaning: '破旧；不适',
        example: 'The seediness of the neighbourhood surprised us.',
        exampleTranslation: '这一带的破败让我们很吃惊。',
      },
      {
        word: 'seedling',
        pos: 'n.',
        meaning: '幼苗',
        example: 'Water the seedlings every morning.',
        exampleTranslation: '每天早上给幼苗浇水。',
      },
    ],
    confusables: [
      {
        word: 'shabby',
        meaning: '破旧的；衣衫褴褛的',
        difference: 'shabby 只说东西旧、穿着寒酸；seedy 还带有"不正当、名声差"的意味',
        example: 'He wore a shabby old coat.',
        exampleTranslation: '他穿着一件破旧的外套。',
      },
      {
        word: 'sleazy',
        meaning: '低俗的；肮脏的',
        difference: 'sleazy 更强调道德上的下流，seedy 侧重环境破败',
        example: 'It was a sleazy nightclub full of crooks.',
        exampleTranslation: '那是一家满是骗子的低俗夜总会。',
      },
    ],
  },
  extraordinary: {
    forms: [{ label: '原形', word: 'extraordinary' }],
    family: [
      {
        word: 'extraordinarily',
        pos: 'adv.',
        meaning: '非常；格外',
        example: 'She is extraordinarily beautiful.',
        exampleTranslation: '她格外漂亮。',
      },
      {
        word: 'ordinary',
        pos: 'adj.',
        meaning: '普通的；平常的',
        example: 'It was just an ordinary day.',
        exampleTranslation: '那只是平常的一天。',
      },
      {
        word: 'ordinarily',
        pos: 'adv.',
        meaning: '通常；一般地',
        example: 'Ordinarily, I walk to work.',
        exampleTranslation: '我平时走路上班。',
      },
    ],
    confusables: [
      {
        word: 'exceptional',
        meaning: '杰出的；例外的',
        difference: 'exceptional 多用于褒义，指出类拔萃；extraordinary 还可以指离奇、出乎意料',
        example: 'She is an exceptional student.',
        exampleTranslation: '她是一名优秀的学生。',
      },
    ],
  },
  magazine: {
    forms: [
      { label: '原形', word: 'magazine' },
      { label: '复数', word: 'magazines' },
    ],
    family: [],
    confusables: [
      {
        word: 'journal',
        meaning: '期刊；日志',
        difference: 'journal 多指学术或专业期刊，magazine 指面向大众的杂志',
        example: 'The paper was published in a medical journal.',
        exampleTranslation: '这篇论文发表在一份医学期刊上。',
      },
      {
        word: 'periodical',
        meaning: '期刊',
        difference: 'periodical 是所有定期出版物的统称，较正式',
        example: 'The library keeps back issues of periodicals.',
        exampleTranslation: '图书馆保存着期刊的过刊。',
      },
    ],
  },
};

export const mockCollocations: Record<string, Collocation[]> = {
  go: [
    {
      phrase: 'go on',
      forms: ['go on', 'goes on', 'went on', 'gone on', 'going on'],
      meaning: '继续；发生',
      example: 'Please go on with your story.',
      exampleTranslation: '请继续讲你的故事。',
    },
    {
      phrase: 'go through',
      forms: ['go through', 'goes through', 'went through', 'gone through', 'going through'],
      meaning: '经历；仔细检查',
      example: 'She has gone through a lot this year.',
      exampleTranslation: '她今年经历了很多。',
    },
    {
      phrase: 'go off',
      forms: ['go off', 'goes off', 'went off', 'gone off', 'going off'],
      meaning: '（闹钟）响；（食物）变质',
      example: 'My alarm went off at six.',
      exampleTranslation: '我的闹钟六点响了。',
    },
    {
      phrase: 'go for',
      forms: ['go for', 'goes for', 'went for', 'gone for', 'going for'],
      meaning: '选择；争取',
      example: "I'll go for the fish.",
      exampleTranslation: '我要鱼。',
    },
    {
      phrase: 'go without',
      forms: ['go without', 'goes without', 'went without', 'gone without', 'going without'],
      meaning: '没有……也行',
      example: 'We had to go without sleep.',
      exampleTranslation: '我们只好不睡觉。',
    },
  ],
  seedy: [
    {
      phrase: 'feel seedy',
      forms: ['feel seedy', 'feels seedy', 'felt seedy', 'feeling seedy'],
      meaning: '觉得不舒服',
      example: 'I feel a bit seedy this morning.',
      exampleTranslation: '我今天早上有点不舒服。',
    },
    {
      phrase: 'seedy hotel / bar',
      forms: ['seedy hotel / bar', 'seedy hotel', 'seedy bar'],
      meaning: '破旧的旅馆 / 酒吧',
      example: 'They met in a seedy bar downtown.',
      exampleTranslation: '他们在市中心一家破旧的酒吧见面。',
    },
    {
      phrase: 'the seedy side of',
      forms: ['the seedy side of'],
      meaning: '……不光彩的一面',
      example: 'The novel explores the seedy side of Hollywood.',
      exampleTranslation: '这部小说探讨了好莱坞不光彩的一面。',
    },
  ],
  extraordinary: [
    {
      phrase: 'an extraordinary thing',
      forms: ['an extraordinary thing'],
      meaning: '一件怪事',
      example: 'It is a most extraordinary thing.',
      exampleTranslation: '这真是件怪事。',
    },
    {
      phrase: 'extraordinary talent',
      forms: ['extraordinary talent'],
      meaning: '非凡的才能',
      example: 'He showed extraordinary talent as a child.',
      exampleTranslation: '他小时候就显示出非凡的才能。',
    },
    {
      phrase: 'extraordinary meeting',
      forms: ['extraordinary meeting'],
      meaning: '特别会议',
      example: 'The board called an extraordinary meeting.',
      exampleTranslation: '董事会召开了一次特别会议。',
    },
  ],
  magazine: [
    {
      phrase: 'fashion magazine',
      forms: ['fashion magazine'],
      meaning: '时尚杂志',
      example: 'She works for a fashion magazine.',
      exampleTranslation: '她在一家时尚杂志社工作。',
    },
    {
      phrase: 'subscribe to a magazine',
      forms: [
        'subscribe to a magazine',
        'subscribes to a magazine',
        'subscribed to a magazine',
        'subscribing to a magazine',
      ],
      meaning: '订阅杂志',
      example: 'We subscribe to two monthly magazines.',
      exampleTranslation: '我们订了两份月刊。',
    },
    {
      phrase: 'magazine article',
      forms: ['magazine article'],
      meaning: '杂志文章',
      example: 'I read a magazine article about heart disease.',
      exampleTranslation: '我读过一篇关于心脏病的杂志文章。',
    },
  ],
};
