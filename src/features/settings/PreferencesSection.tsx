import { useEffect, useState } from 'react';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { getAccent, setAccent } from '../../services/settings';
import type { Accent } from '../../types/settings';

const ACCENTS: readonly { value: Accent; label: string }[] = [
  { value: 'us', label: '美音' },
  { value: 'uk', label: '英音' },
];

/** 设置页的偏好区（7.1）：发音口音、开机启动。都是改完立即保存、立即生效 */
export function PreferencesSection() {
  return (
    <section>
      <h2 className="text-title font-semibold text-ink">偏好</h2>
      <div className="mt-4 flex flex-col gap-5 rounded-card bg-surface p-4 shadow-card">
        <AccentRow />
        <AutostartRow />
      </div>
    </section>
  );
}

function AccentRow() {
  const [accent, setValue] = useState<Accent | null>(null);

  useEffect(() => {
    let alive = true;
    getAccent()
      .then((value) => {
        if (alive) setValue(value);
      })
      .catch((error: unknown) => {
        console.warn('读取口音设置失败', error);
      });
    return () => {
      alive = false;
    };
  }, []);

  const change = (next: Accent) => {
    if (next === accent) return;
    setValue(next);
    setAccent(next).catch((error: unknown) => {
      console.warn('保存口音失败', error);
    });
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-footnote text-ink-body">发音口音</p>
        <p className="mt-0.5 text-caption text-ink-soft">单词朗读和查词音标都按它来</p>
      </div>
      <div
        role="radiogroup"
        aria-label="发音口音"
        className="grid w-40 shrink-0 grid-cols-2 gap-1 rounded-field bg-segment p-1"
      >
        {ACCENTS.map(({ value, label }) => {
          const selected = value === accent;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => change(value)}
              className={`rounded-[7px] py-1.5 text-callout ${
                selected
                  ? 'bg-surface font-medium text-ink shadow-segment'
                  : 'text-ink-body hover:text-ink'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AutostartRow() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    isEnabled()
      .then((value) => {
        if (alive) setEnabled(value);
      })
      .catch((error: unknown) => {
        console.warn('读取开机启动状态失败', error);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function toggle() {
    if (enabled === null) return;
    const next = !enabled;
    try {
      // 状态由系统（LaunchAgent / 注册表）管着，插件读写的就是它，不用自己存
      await (next ? enable() : disable());
      setEnabled(next);
    } catch (error: unknown) {
      console.warn('切换开机启动失败', error);
    }
  }

  return (
    <label className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-footnote text-ink-body">开机时自动启动</span>
        <span className="mt-0.5 block text-caption text-ink-soft">
          开机后自动驻留托盘，等快捷键呼出
        </span>
      </span>
      <input
        type="checkbox"
        checked={enabled ?? false}
        disabled={enabled === null}
        onChange={() => void toggle()}
        className="h-4 w-4 shrink-0 accent-primary"
      />
    </label>
  );
}
