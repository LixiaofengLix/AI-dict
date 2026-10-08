import { useId, useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'id'> & {
  label: string;
  /** 密文显示，右侧可以切换明文 */
  secret?: boolean;
  onValueChange: (value: string) => void;
};

// 设置页的输入框：标题 + 一行输入，密文字段带"显示 / 隐藏"
export function FormField({ label, secret = false, onValueChange, ...input }: Props) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const hidden = secret && !revealed;

  return (
    <div>
      <label htmlFor={id} className="text-footnote text-ink-body">
        {label}
      </label>
      <div className="mt-1.5 flex h-11 items-center gap-2 rounded-field border border-line bg-sheet px-3 focus-within:border-primary">
        <input
          {...input}
          id={id}
          type={hidden ? 'password' : 'text'}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onValueChange(event.target.value)}
          className="w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-faint"
        />
        {secret && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={hidden ? `显示${label}` : `隐藏${label}`}
            className="shrink-0 text-caption text-ink-soft hover:text-ink-body"
          >
            {hidden ? '显示' : '隐藏'}
          </button>
        )}
      </div>
    </div>
  );
}
