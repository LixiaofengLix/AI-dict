import { useEffect, useState } from 'react';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { getAccent, setAccent } from '../../services/settings';
import { Segment } from '../../components/Segment';
import { Switch } from '../../components/Switch';
import { CAPTION, PANEL, PANEL_TITLE } from '../../components/styles';
import type { Accent } from '../../types/settings';

const ACCENTS: readonly { value: Accent; label: string }[] = [
  { value: 'us', label: '美音' },
  { value: 'uk', label: '英音' },
];

/** 一行偏好（样张 .pref）：左边标题 + 说明，右边控件；行与行之间一条细线 */
const PREF_ROW =
  'flex items-center justify-between gap-4 border-b border-line py-2.5 first:pt-0 last:border-b-0 last:pb-0';

/** 设置页的偏好区（7.1，样张 12 右下）：发音口音、开机启动。都是改完立即保存、立即生效 */
export function PreferencesSection() {
  return (
    <section className={PANEL.plain}>
      <h2 className={PANEL_TITLE}>偏好</h2>
      <div>
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
    <div className={PREF_ROW}>
      <div>
        <p className="text-[13px] font-bold text-ink">发音口音</p>
        <p className={CAPTION}>单词朗读和查词音标都按它来</p>
      </div>
      <Segment
        options={ACCENTS}
        value={accent}
        onChange={change}
        label="发音口音"
        className="w-[150px]"
      />
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
    <label className={PREF_ROW}>
      <span>
        <span className="block text-[13px] font-bold text-ink">开机时自动启动</span>
        <span className={`block ${CAPTION}`}>开机后驻留托盘，等快捷键呼出</span>
      </span>
      <Switch
        label="开机时自动启动"
        checked={enabled ?? false}
        disabled={enabled === null}
        onChange={() => void toggle()}
      />
    </label>
  );
}
