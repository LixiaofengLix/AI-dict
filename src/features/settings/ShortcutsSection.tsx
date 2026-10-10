import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { Keys } from '../../components/Keys';
import { buttonClass, CAPTION, FIELD_LABEL, PANEL, PANEL_TITLE } from '../../components/styles';
import { applyShortcuts, pauseShortcuts, resumeShortcuts } from '../../services/shortcut';
import { getShortcuts, setShortcuts, type Shortcuts } from '../../services/settings';
import { POPUP_ACTION_LABELS, type PopupAction } from '../../services/window';
import { acceleratorFromKey, heldModifiers } from '../../utils/keyboard';
import { isMac } from '../../utils/platform';

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
        点一下框，直接按下想用的组合键（要带 Ctrl、Alt 或 {isMac ? 'Cmd' : 'Win'}，F
        键可以单独用）。保存后立即重新注册，被占用时保持原来的。
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
 * 一个快捷键（样张 .kbd-field）：平时显示成一排键帽，点一下开始录，直接按下组合键就记下来。
 * 录的时候全局快捷键先注销，按到原来的组合也不会弹窗；Esc、点别处或再点一下放弃。
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [recording, setRecording] = useState(false);
  const [held, setHeld] = useState<string[]>([]);

  const stop = () => {
    setRecording(false);
    setHeld([]);
  };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'keyup') {
      setHeld(heldModifiers(event, isMac));
      return;
    }
    if (event.key === 'Escape' && heldModifiers(event, isMac).length === 0) {
      stop();
      return;
    }
    const accelerator = acceleratorFromKey(event, isMac);
    if (accelerator) {
      onChange(accelerator);
      stop();
    } else {
      setHeld(heldModifiers(event, isMac));
    }
  });

  // macOS 的 WebKit 点按钮不给它焦点，按键到不了按钮上，所以录的时候在整个窗口上听
  useEffect(() => {
    if (!recording) return;
    void pauseShortcuts();
    const onPointerDown = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) stop();
    };
    const onWindowBlur = () => stop();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('blur', onWindowBlur);
      void resumeShortcuts();
    };
  }, [recording]);

  return (
    <div>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-pressed={recording}
        onClick={() => (recording ? stop() : setRecording(true))}
        title={recording ? '按下新的组合键，Esc 取消' : '点击后按下新的组合键'}
        className={`flex min-h-[34px] w-full items-center gap-1.5 rounded-full border bg-soft px-1.5 py-[5px] text-left outline-none ${
          recording ? 'border-ink' : 'border-line hover:border-ink-soft'
        }`}
      >
        {recording ? (
          <>
            {held.length > 0 && <Keys accelerator={held.join('+')} />}
            <span className="px-1.5 text-[13px] text-ink-soft">
              {held.length > 0 ? '再按一个键…' : '按下新的组合键，Esc 取消'}
            </span>
          </>
        ) : value ? (
          <Keys accelerator={value} />
        ) : (
          <span className="px-2 py-0.5 text-[13px] text-ink-soft">点击后按下组合键</span>
        )}
      </button>
    </div>
  );
}
