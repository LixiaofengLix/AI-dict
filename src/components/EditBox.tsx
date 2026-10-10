import { useState } from 'react';
import { isImeEnter } from '../utils/keyboard';

/**
 * 双击原文后出来的编辑框：回车提交、Shift+回车换行，Esc 或点别处放弃。
 * 没改（或改成空）就当放弃。高度跟着内容走（field-sizing），样式由外面给。
 */
export function EditBox({
  initial,
  onCommit,
  onCancel,
  className,
}: {
  initial: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
  className: string;
}) {
  const [value, setValue] = useState(initial);

  return (
    <textarea
      autoFocus
      rows={1}
      value={value}
      aria-label="修改要查的内容"
      onChange={(event) => setValue(event.target.value)}
      // 光标放到末尾，接着往后改最顺手
      onFocus={(event) => event.currentTarget.setSelectionRange(value.length, value.length)}
      onBlur={onCancel}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          // 只退出编辑，不让弹窗那个 Esc 关窗口的监听收到
          event.stopPropagation();
          onCancel();
          return;
        }
        if (event.key !== 'Enter' || event.shiftKey || isImeEnter(event.nativeEvent)) return;
        event.preventDefault();
        const text = value.trim();
        if (text && text !== initial.trim()) onCommit(text);
        else onCancel();
      }}
      className={`field-sizing-content resize-none outline-none ${className}`}
    />
  );
}
