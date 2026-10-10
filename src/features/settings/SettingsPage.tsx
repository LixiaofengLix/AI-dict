import type { ReactNode } from 'react';
import AiConfigPage from './AiConfigPage';
import { OcrSection } from './OcrSection';
import { PreferencesSection } from './PreferencesSection';
import { PromptsSection } from './PromptsSection';
import { ShortcutsSection } from './ShortcutsSection';

export type SettingsTab = 'app' | 'ai' | 'prompts';

const TABS: readonly { value: SettingsTab; label: string }[] = [
  { value: 'app', label: '应用设置' },
  { value: 'ai', label: 'AI 设置' },
  { value: 'prompts', label: '提示词设置' },
];

/**
 * 设置页：左边一列菜单，右边是选中的那一页。
 * 三页都一直挂着、只是藏起来，切页时没保存的修改不会丢。
 */
export function SettingsPage({
  tab,
  onTabChange,
}: {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}) {
  return (
    <div className="flex h-full">
      <nav
        role="tablist"
        aria-label="设置"
        aria-orientation="vertical"
        className="flex w-[168px] shrink-0 flex-col gap-1 border-r border-line bg-soft px-3 py-5"
      >
        {TABS.map(({ value, label }) => {
          const selected = value === tab;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              id={`settings-tab-${value}`}
              aria-selected={selected}
              aria-controls={`settings-panel-${value}`}
              onClick={() => onTabChange(value)}
              className={`rounded-[12px] px-3.5 py-2 text-left text-[13px] font-bold ${
                selected ? 'bg-ink text-surface' : 'text-ink-body hover:bg-segment hover:text-ink'
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <div className="scroll-thin min-w-0 flex-1 overflow-y-auto">
        <TabPanel value="app" tab={tab}>
          <div className="grid grid-cols-2 items-start gap-[22px]">
            <ShortcutsSection />
            <PreferencesSection />
          </div>
        </TabPanel>
        <TabPanel value="ai" tab={tab}>
          <div className="flex max-w-[560px] flex-col gap-[22px]">
            <AiConfigPage />
            <OcrSection />
          </div>
        </TabPanel>
        <TabPanel value="prompts" tab={tab}>
          <PromptsSection />
        </TabPanel>
      </div>
    </div>
  );
}

function TabPanel({
  value,
  tab,
  children,
}: {
  value: SettingsTab;
  tab: SettingsTab;
  children: ReactNode;
}) {
  return (
    <section
      role="tabpanel"
      id={`settings-panel-${value}`}
      aria-labelledby={`settings-tab-${value}`}
      hidden={value !== tab}
      className="px-6 pt-5 pb-[26px]"
    >
      {children}
    </section>
  );
}
