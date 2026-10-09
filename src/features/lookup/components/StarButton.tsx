import type { StarDetails } from '../../../services/vocabulary';
import { useStarred } from '../hooks/useStarred';

type Props = {
  /** 收藏要写的内容；null 表示 AI 词典还没加载出来（或失败），星标禁用 */
  details: StarDetails | null;
  sentence: string;
};

/**
 * 词头的收藏星标（6.1）。按「词 + 句子」显示：空心 = 这句话里的语境还没收，
 * 点击收藏；实心 = 收过了，点击删掉这条语境（词再无别的语境时连词删）。
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
      className={`shrink-0 rounded p-1 text-primary ${disabled ? 'opacity-40' : 'hover:bg-line'}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill={starred ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
      </svg>
    </button>
  );
}
