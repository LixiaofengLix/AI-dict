import { useSpeak } from '../hooks/useSpeak';

/** 音标胶囊（样张 .phonetic）：音标 + 喇叭，整个胶囊都可以点，点一下按设置的口音朗读 */
export function PhoneticPill({ word, phonetic }: { word: string; phonetic: string | null }) {
  const speak = useSpeak();

  return (
    <button
      type="button"
      onClick={() => speak(word)}
      aria-label={phonetic ? `发音 /${phonetic}/` : '发音'}
      className="inline-flex shrink-0 items-center gap-[5px] rounded-full bg-segment px-[9px] py-[3px] text-footnote font-medium tracking-normal whitespace-nowrap text-ink-body hover:text-ink"
    >
      <span>{phonetic ? `/${phonetic}/` : '发音'}</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[13px] w-[13px]"
      >
        <path d="M11 5 6 9H3v6h3l5 4z" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      </svg>
    </button>
  );
}
