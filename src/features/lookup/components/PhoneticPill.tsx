import { useSpeak } from '../hooks/useSpeak';

/** 深色胶囊：音标 + 喇叭，整个胶囊都可以点，点一下按设置的口音朗读 */
export function PhoneticPill({ word, phonetic }: { word: string; phonetic: string | null }) {
  const speak = useSpeak();

  return (
    <button
      type="button"
      onClick={() => speak(word)}
      aria-label={phonetic ? `发音 /${phonetic}/` : '发音'}
      className="flex h-8 items-center gap-2 self-start rounded-full bg-ink px-4 text-callout text-page hover:opacity-90"
    >
      <span>{phonetic ? `/${phonetic}/` : '发音'}</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M4 9.5h3L11 6v12l-4-3.5H4z" />
        <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
        <path d="M17.5 7a7 7 0 0 1 0 10" />
      </svg>
    </button>
  );
}
