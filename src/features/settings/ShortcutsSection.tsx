import { useEffect, useId, useState } from 'react';
import { Keys } from '../../components/Keys';
import {
  buttonClass,
  CAPTION,
  FIELD_LABEL,
  PANEL,
  PANEL_TITLE,
  PILL_FIELD,
} from '../../components/styles';
import { applyShortcuts } from '../../services/shortcut';
import { getShortcuts, setShortcuts, type Shortcuts } from '../../services/settings';
import { POPUP_ACTION_LABELS, type PopupAction } from '../../services/window';

const ACTIONS: readonly PopupAction[] = ['selection', 'input'];

type Status = { ok: boolean; text: string };

/** 设置页的快捷键区（7.1，样张 12 右上）：两个键帽框，保存后立即重新注册 */
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
    <section className={PANEL.plain}>
      <h2 className={PANEL_TITLE}>快捷键</h2>
      <div className="flex flex-col gap-2.5">
        {ACTIONS.map((action) => (
          <ShortcutField
            key={action}
            label={POPUP_ACTION_LABELS[action]}
            value={form[action]}
            onChange={(value) => update({ [action]: value })}
          />
        ))}
      </div>
      <p className={`mx-1 mt-2.5 ${CAPTION}`}>
        写法如 Alt+D、CmdOrCtrl+Shift+A。保存后立即重新注册，被占用时保持原来的。
      </p>
      <div className="mt-4 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className={buttonClass('dark', 'sm')}
        >
          {busy ? '保存中…' : '保存快捷键'}
        </button>
        {status && (
          <span
            className={`min-w-0 text-footnote font-bold ${status.ok ? 'text-success' : 'text-danger'}`}
          >
            {status.text}
          </span>
        )}
      </div>
    </section>
  );
}

/**
 * 一个快捷键（样张 .kbd-field）：平时显示成一排键帽，点一下变成输入框改写法，
 * 失焦或回车回到键帽。
 */
function ShortcutField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      {editing ? (
        <input
          id={id}
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          placeholder="Alt+D"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={PILL_FIELD}
        />
      ) : (
        <button
          id={id}
          type="button"
          onClick={() => setEditing(true)}
          title="点击修改"
          className="flex w-full items-center gap-1.5 rounded-full border border-line bg-soft px-1.5 py-[5px] text-left hover:border-ink-soft"
        >
          {value ? (
            <Keys accelerator={value} />
          ) : (
            <span className="px-2 py-0.5 text-[13px] text-ink-soft">点击填写，如 Alt+D</span>
          )}
        </button>
      )}
    </div>
  );
}
