import type { StarDetails } from '../../../services/vocabulary';
import { useStarred } from '../hooks/useStarred';

type Props = {
  /** 收藏要写的内容；null 表示 AI 词典还没加载出来（或失败），星标禁用 */
  details: StarDetails | null;
  sentence: string;
};

/**
 * 词头的收藏星标（6.1，样式见样张 .star）。按「词 + 句子」显示：
 * 白底黑框空心星 = 这句话里的语境还没收，点击收藏；橙底白星 = 收过了，点击删掉这条语境
 * （词再无别的语境时连词删）；灰框 = 词典还没好，不能点。
 */
export function StarButton({ details, sentence }: Props) {
  const { starred, pending, toggle } = useStarred(details, sentence);
  // 状态未知（词典没好、还在读）和写入中都不可点
  const disabled = starred === null || pending;
  const word = details?.word ?? '';
  const label = starred ? `取消收藏 ${word}` : `收藏 ${word}`;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={disabled}
      aria-label={label}
      aria-pressed={starred ?? false}
      title={
        details === null
          ? 'AI 词典加载完才能收藏'
          : starred
            ? '取消收藏（去掉这条语境）'
            : sentence
              ? '收藏进生词本（连同这句话）'
              : '收藏进生词本'
      }
      className={`ml-auto grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full border-2 ${
        starred === null
          ? 'cursor-default border-line bg-surface text-ink-soft'
          : starred
            ? 'border-ink bg-primary text-on-primary'
            : 'border-ink bg-surface text-ink'
      } ${pending ? 'cursor-default' : ''}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill={starred ? 'currentColor' : 'none'}
        stroke={starred ? 'none' : 'currentColor'}
        strokeWidth="2.2"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" />
      </svg>
    </button>
  );
}
