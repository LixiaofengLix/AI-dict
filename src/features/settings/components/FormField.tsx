import { useId, type InputHTMLAttributes } from 'react';
import { FIELD_LABEL, PILL_FIELD } from '../../../components/styles';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'id'> & {
  label: string;
  /** 密文显示 */
  secret?: boolean;
  onValueChange: (value: string) => void;
};

// 设置页的输入框（样张 .fl + .pill-field）：小标题 + 胶囊输入框
export function FormField({ label, secret = false, onValueChange, ...input }: Props) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        {...input}
        id={id}
        type={secret ? 'password' : 'text'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onValueChange(event.target.value)}
        className={PILL_FIELD}
      />
    </div>
  );
}
