/**
 * 分段控件（样张 .segment）：浅灰底轨，选中项黑底白字。
 * 词卡的三个 Tab 用 role="tab"，设置页的单选用 role="radio"。
 */
export function Segment<T extends string>({
  options,
  value,
  onChange,
  label,
  role = 'radio',
  className = '',
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  /** 读屏用的名字 */
  label: string;
  role?: 'tab' | 'radio';
  className?: string;
}) {
  return (
    <div
      role={role === 'tab' ? 'tablist' : 'radiogroup'}
      aria-label={label}
      className={`grid shrink-0 gap-[3px] rounded-[12px] bg-segment p-[3px] ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role={role}
            {...(role === 'tab' ? { 'aria-selected': selected } : { 'aria-checked': selected })}
            onClick={() => onChange(option.value)}
            className={`rounded-[9px] py-[5px] text-center text-callout font-semibold ${
              selected ? 'bg-ink text-surface' : 'text-ink-body hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
