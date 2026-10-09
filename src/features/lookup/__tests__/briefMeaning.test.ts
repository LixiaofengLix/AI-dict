import { describe, expect, it } from 'vitest';
import type { AiDictSense } from '../../../types/ai';
import { briefMeaning } from '../briefMeaning';

const sense = (pos: string, meaning: string): AiDictSense => ({
  pos,
  meaning,
  definition: '',
  example: '',
  exampleTranslation: '',
});

const entry = (senses: AiDictSense[]) => ({ word: 'go', phonetic: null, tags: [], senses });

describe('briefMeaning', () => {
  it('相邻同词性合并，只取前三条', () => {
    expect(
      briefMeaning(
        entry([
          sense('v.', '去；走'),
          sense('v.', '离开'),
          sense('n.', '尝试'),
          sense('n.', '轮到'),
        ]),
      ),
    ).toBe('v. 去；走；离开  n. 尝试');
  });

  it('没有词性时只显示释义', () => {
    expect(briefMeaning(entry([sense('', '人名')]))).toBe('人名');
  });
});
