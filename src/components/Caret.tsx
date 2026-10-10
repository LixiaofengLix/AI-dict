/** 流式输出时跟在文字后面的橙色光标（样张 .caret） */
export function Caret() {
  return (
    <span
      aria-hidden
      className="ml-[3px] inline-block h-[1em] w-2 animate-blink rounded-[2px] bg-primary align-[-2px]"
    />
  );
}
