import { useEffect, useState } from 'react';
import { applyShortcuts } from '../../services/shortcut';
import { getShortcuts, setShortcuts, type Shortcuts } from '../../services/settings';
import { POPUP_ACTION_LABELS, type PopupAction } from '../../services/window';
import { FormField } from './components/FormField';

const ACTIONS: readonly PopupAction[] = ['selection', 'input'];

type Status = { ok: boolean; text: string };

/** 设置页的快捷键区（7.1）：两个输入框，保存后立即重新注册 */
export function ShortcutsSection() {
  const [form, setForm] = useState<Shortcuts | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let alive = true;
    getShortcuts()
      .then((value) => {
        if (alive) setForm(value);
      })
      .catch((error: unknown) => {
        console.warn('读取快捷键设置失败', error);
      });
    return () => {
      alive = false;
    };
  }, []);

  const update = (patch: Partial<Shortcuts>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    setStatus(null);
  };

  async function save() {
    if (!form) return;
    setBusy(true);
    setStatus(null);
    try {
      // 先尝试注册，注册成功（或回滚完）的才是实际生效的，按它存库
      const { failed, applied } = await applyShortcuts(form);
      await setShortcuts(applied);
      setForm(applied);
      setStatus(
        failed.length === 0
          ? { ok: true, text: '已保存，立即生效' }
          : {
              ok: false,
              text: `${failed
                .map(({ action }) => POPUP_ACTION_LABELS[action])
                .join('、')} 的快捷键没能注册（被别的程序占用或写法不对），已恢复原来的`,
            },
      );
    } catch (error: unknown) {
      console.error('保存快捷键失败', error);
      setStatus({ ok: false, text: '保存失败，请重试' });
    } finally {
      setBusy(false);
    }
  }

  if (!form) {
    return null;
  }

  return (
    <section>
      <h2 className="text-title font-semibold text-ink">快捷键</h2>
      <div className="mt-4 flex flex-col gap-4 rounded-card bg-surface p-4 shadow-card">
        {ACTIONS.map((action) => (
          <FormField
            key={action}
            label={POPUP_ACTION_LABELS[action]}
            value={form[action]}
            onValueChange={(value) => update({ [action]: value })}
            placeholder="Alt+D"
          />
        ))}
      </div>
      <p className="mt-2 px-1 text-caption leading-relaxed text-ink-soft">
        写法如 Alt+D、CmdOrCtrl+Shift+A。保存后立即重新注册，被别的程序占用时保持原来的。
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="rounded-field bg-primary px-3 py-1.5 text-callout text-on-primary disabled:opacity-50"
        >
          {busy ? '保存中…' : '保存快捷键'}
        </button>
        {status && (
          <span className={`text-callout ${status.ok ? 'text-success' : 'text-danger'}`}>
            {status.text}
          </span>
        )}
      </div>
    </section>
  );
}
