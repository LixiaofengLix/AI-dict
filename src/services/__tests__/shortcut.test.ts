import { beforeEach, describe, expect, it, vi } from 'vitest';

// 假的全局快捷键注册表：register 成功进集合，failOn 里的键模拟"被别的程序占用"
const fake = vi.hoisted(() => ({
  registered: new Set<string>(),
  failOn: new Set<string>(),
  log: [] as string[],
}));

vi.mock('@tauri-apps/plugin-global-shortcut', () => ({
  register: async (accelerator: string) => {
    fake.log.push(`register ${accelerator}`);
    if (fake.failOn.has(accelerator)) {
      throw new Error('RegisterEventHotKey failed');
    }
    fake.registered.add(accelerator);
  },
  unregister: async (accelerator: string) => {
    fake.log.push(`unregister ${accelerator}`);
    fake.registered.delete(accelerator);
  },
}));

// applyShortcuts 只在回调里用到弹窗，测试里不触发
vi.mock('../window', () => ({
  showPopup: vi.fn(),
  POPUP_ACTION_LABELS: { selection: '划词翻译', input: '输入翻译' },
}));

const A = { selection: 'Alt+D', input: 'Alt+S' };
const B = { selection: 'Alt+J', input: 'Alt+S' };

beforeEach(() => {
  // shortcut.ts 的"当前快捷键"存在模块作用域里，每个用例重新加载模块从头来过
  vi.resetModules();
  fake.registered.clear();
  fake.failOn.clear();
  fake.log = [];
});

describe('applyShortcuts', () => {
  it('首次注册两个快捷键，没有失败', async () => {
    const { applyShortcuts } = await import('../shortcut');

    const { failed, applied } = await applyShortcuts(A);

    expect(failed).toEqual([]);
    expect(applied).toEqual(A);
    expect(fake.registered).toEqual(new Set(['Alt+D', 'Alt+S']));
  });

  it('改一个键：取消旧的、注册新的，没动的那个不重新注册', async () => {
    const { applyShortcuts } = await import('../shortcut');
    await applyShortcuts(A);
    fake.log = [];

    const { failed, applied } = await applyShortcuts(B);

    expect(failed).toEqual([]);
    expect(applied).toEqual(B);
    expect(fake.log).toEqual(['unregister Alt+D', 'register Alt+J']);
    expect(fake.registered).toEqual(new Set(['Alt+J', 'Alt+S']));
  });

  it('新键被别人占用时注册失败，回滚到原来的并把失败报出来', async () => {
    const { applyShortcuts } = await import('../shortcut');
    await applyShortcuts(A);
    fake.failOn.add('Alt+J');

    const { failed, applied } = await applyShortcuts(B);

    expect(failed).toEqual([{ action: 'selection', accelerator: 'Alt+J' }]);
    expect(applied).toEqual(A);
    expect(fake.registered).toEqual(new Set(['Alt+D', 'Alt+S']));
  });

  it('重复保存同一套不重复注册', async () => {
    const { applyShortcuts } = await import('../shortcut');
    await applyShortcuts(A);
    fake.log = [];

    await applyShortcuts(A);

    expect(fake.log).toEqual([]);
  });

  it('首次注册就失败（没得回滚）：记进失败列表，值仍算当前，下次启动会再试', async () => {
    const { applyShortcuts } = await import('../shortcut');
    fake.failOn.add('Alt+J');

    const { failed, applied } = await applyShortcuts({ selection: 'Alt+J', input: 'Alt+S' });

    expect(failed).toEqual([{ action: 'selection', accelerator: 'Alt+J' }]);
    expect(applied).toEqual({ selection: 'Alt+J', input: 'Alt+S' });
    expect(fake.registered).toEqual(new Set(['Alt+S']));
  });
});
