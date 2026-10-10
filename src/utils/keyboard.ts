/**
 * 这次回车是不是输入法在选词，选词的回车不能当成提交。
 * WebKit（WKWebView）有个坑：确认候选词那一下 compositionend 先于 keydown 到，
 * 等 keydown 时 isComposing 已经是 false 了，只有 keyCode 229（VK_PROCESSKEY，被输入法处理过的键）
 * 还认得出它。所以两个都要看，靠记 compositionstart/end 的状态没用（WebKit bug 165004）。
 */
export function isImeEnter(event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229;
}

/** 录快捷键要看的那几个字段（KeyboardEvent 的子集，方便单测） */
export type KeyPress = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>;

/** 除字母、数字、F 键外能当主键的键（按物理位置 code，和 Tauri 快捷键写法同名） */
const NAMED_KEYS = new Set([
  'Space',
  'Enter',
  'Tab',
  'Backspace',
  'Delete',
  'Insert',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Minus',
  'Equal',
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'Semicolon',
  'Quote',
  'Comma',
  'Period',
  'Slash',
  'Backquote',
]);

/** 主键的写法；修饰键本身和不认识的键返回 null */
function mainKey(code: string): string | null {
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];
  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) return digit[1];
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
  return NAMED_KEYS.has(code) ? code : null;
}

/**
 * 当前按着的修饰键，按 Ctrl、Alt、Shift、Cmd 的顺序。
 * Windows 上的 Win 键在 Tauri 里叫 Super；macOS 的 Option 写成 Alt，和默认值一致。
 */
export function heldModifiers(press: KeyPress, mac: boolean): string[] {
  return [
    ...(press.ctrlKey ? ['Ctrl'] : []),
    ...(press.altKey ? ['Alt'] : []),
    ...(press.shiftKey ? ['Shift'] : []),
    ...(press.metaKey ? [mac ? 'Cmd' : 'Super'] : []),
  ];
}

/**
 * 把一次按键换成快捷键写法，如 Alt+D、Ctrl+Shift+F5。
 * 用 code 而不是 key：macOS 上 Option+D 的 key 是 "∂"，输入法开着时 key 也不可靠。
 * 还没按到主键，或者只按了 Shift / 没按修饰键（会和打字冲突，F 键除外）时返回 null。
 */
export function acceleratorFromKey(press: KeyPress, mac: boolean): string | null {
  const key = mainKey(press.code);
  if (!key) return null;
  const modifiers = heldModifiers(press, mac);
  const strong = press.ctrlKey || press.altKey || press.metaKey;
  if (!strong && !/^F\d+$/.test(key)) return null;
  return [...modifiers, key].join('+');
}
