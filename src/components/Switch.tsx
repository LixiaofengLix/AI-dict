/**
 * 开关（样张 .switch）：黑描边，开了是橙底白钮。
 *
 * 放在 <label> 里当整行右侧的控件——点行里的文字也能切换（辅助功能权限提示里那个复选框的做法）。
 * 视觉部分是 input 的兄弟节点（peer），所以调用方的 label 要直接包住这个组件。
 */
export function Switch({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  /** 读屏用的名字；视觉上这一行有自己的文字说明，控件本身没有 */
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <>
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-ink bg-segment transition-colors after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-ink after:transition-all peer-checked:bg-primary peer-checked:after:left-[18px] peer-checked:after:bg-surface peer-disabled:opacity-40"
      />
    </>
  );
}
