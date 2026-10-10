import { describe, expect, it } from 'vitest';
import { acceleratorFromKey, heldModifiers, type KeyPress } from '../keyboard';

const press = (code: string, mods: Partial<Omit<KeyPress, 'code'>> = {}): KeyPress => ({
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
});

describe('acceleratorFromKey', () => {
  it('字母、数字按物理键位取，不管 Option 打出来的字符', () => {
    expect(acceleratorFromKey(press('KeyD', { altKey: true }), true)).toBe('Alt+D');
    expect(acceleratorFromKey(press('Digit1', { ctrlKey: true, shiftKey: true }), false)).toBe(
      'Ctrl+Shift+1',
    );
  });

  it('Meta 在 macOS 是 Cmd，在 Windows 是 Super；修饰键按固定顺序', () => {
    const mods = { metaKey: true, shiftKey: true, ctrlKey: true, altKey: true };
    expect(acceleratorFromKey(press('KeyA', mods), true)).toBe('Ctrl+Alt+Shift+Cmd+A');
    expect(acceleratorFromKey(press('KeyA', { metaKey: true }), false)).toBe('Super+A');
  });

  it('其他键用 code 原名，F 键可以单独用', () => {
    expect(acceleratorFromKey(press('Space', { altKey: true }), true)).toBe('Alt+Space');
    expect(acceleratorFromKey(press('ArrowUp', { ctrlKey: true }), false)).toBe('Ctrl+ArrowUp');
    expect(acceleratorFromKey(press('F5'), true)).toBe('F5');
  });

  it('只按修饰键、没修饰键、只有 Shift、不认识的键都不算', () => {
    expect(acceleratorFromKey(press('AltLeft', { altKey: true }), true)).toBeNull();
    expect(acceleratorFromKey(press('KeyD'), true)).toBeNull();
    expect(acceleratorFromKey(press('KeyD', { shiftKey: true }), true)).toBeNull();
    expect(acceleratorFromKey(press('IntlRo', { altKey: true }), true)).toBeNull();
  });
});

describe('heldModifiers', () => {
  it('录制时显示正按着的修饰键', () => {
    expect(heldModifiers(press('ShiftLeft', { shiftKey: true, altKey: true }), true)).toEqual([
      'Alt',
      'Shift',
    ]);
  });
});
