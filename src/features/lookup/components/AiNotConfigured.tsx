import { Mascot } from '../../../components/Mascot';
import { buttonClass, CENTER_TITLE } from '../../../components/styles';

/** 没配置 AI 时的引导（4.3，样张 10）：说清楚为什么什么都没有，给一条去设置的路 */
export function AiNotConfigured({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 text-center">
      <div className="flex items-end gap-[18px]">
        <Mascot kind="black" />
        <Mascot kind="purple" />
      </div>
      <h3 className={CENTER_TITLE}>还没有配置 AI 服务</h3>
      <p className="max-w-[17rem] text-footnote leading-[1.55] text-ink-soft">
        查词内容由 AI 生成。填写自己的 API Key 后，就能看到 AI 词典、单词簇和常见搭配。
      </p>
      <button type="button" onClick={onOpenSettings} className={buttonClass('accent')}>
        去设置 API Key
      </button>
    </div>
  );
}
