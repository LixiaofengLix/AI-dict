import { useEffect, useState } from 'react';
import { Segment } from '../../components/Segment';
import {
  buttonClass,
  CAPTION,
  FIELD_LABEL,
  PANEL,
  PANEL_TITLE,
  tagClass,
} from '../../components/styles';
import { aiImpl } from '../../services/ai/impl';
import { getAiConfig, setAiConfig } from '../../services/settings';
import type { AiConfig, ThinkingMode } from '../../types/ai';
import { FormField } from './components/FormField';
import { PreferencesSection } from './PreferencesSection';
import { ShortcutsSection } from './ShortcutsSection';

const THINKING_OPTIONS: readonly { value: ThinkingMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
  { value: 'max', label: 'Max' },
];

const THINKING_HINT =
  'DeepSeek 的思考强度，None 为关闭思考。开启后更严谨但慢很多；查词、翻译建议选 None。';

/** 测试连接、保存的结果提示 */
type Status = { ok: boolean; text: string };

/**
 * 设置页（样张 12）：AI 配置（3.4，交互照 ReadingBook 的 AiConfigScreen）、快捷键、口音和开机启动（7.1）。
 * 两列网格：左边是 AI 配置的重点卡，占两行；右边上下是快捷键和偏好。三块各自读写各自的设置，互不影响。
 */
export default function AiConfigPage() {
  const [initial, setInitial] = useState<AiConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAiConfig().then((config) => {
      if (!cancelled) {
        setInitial(config);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="grid grid-cols-2 items-start gap-x-[22px] gap-y-5 px-6 pt-5 pb-[26px]">
        {/* 读到已保存的配置后再挂载表单，输入框的初始值才正确 */}
        {initial ? (
          <AiConfigForm initial={initial} />
        ) : (
          <section className={`row-span-2 ${PANEL.feature}`}>
            <p className={CAPTION}>正在读取配置…</p>
          </section>
        )}
        <ShortcutsSection />
        <PreferencesSection />
      </div>
    </div>
  );
}

function AiConfigForm({ initial }: { initial: AiConfig }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState<'testing' | 'saving' | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  // 最近一次测试连接成功了：标题旁边亮「已连接」，改了任何一项就熄掉
  const [connected, setConnected] = useState(false);
  const complete = Boolean(form.apiKey.trim() && form.baseUrl.trim() && form.model.trim());

  const update = (patch: Partial<AiConfig>) => {
    setForm((f) => ({ ...f, ...patch }));
    // 改了配置，之前的测试结果和"已保存"都不再适用
    setStatus(null);
    setConnected(false);
  };

  const trimmed = (): AiConfig => ({
    apiKey: form.apiKey.trim(),
    baseUrl: form.baseUrl.trim(),
    model: form.model.trim(),
    thinking: form.thinking,
  });

  const test = async (config: AiConfig) => {
    setBusy('testing');
    setStatus(null);
    try {
      const result = await aiImpl.testConnection(config);
      setConnected(result.ok);
      setStatus(
        result.ok
          ? { ok: true, text: '连接成功' }
          : { ok: false, text: `连接失败：${result.message}` },
      );
    } catch (error: unknown) {
      setStatus({
        ok: false,
        text: `连接失败：${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy('saving');
    setStatus(null);
    try {
      await setAiConfig(trimmed());
      setStatus({ ok: true, text: '已保存' });
    } catch (error: unknown) {
      console.error('保存 AI 配置失败', error);
      setStatus({ ok: false, text: '保存失败，请重试' });
    } finally {
      setBusy(null);
    }
  };

  const idle = busy === null;

  return (
    <section className={`row-span-2 ${PANEL.feature}`}>
      <h2 className={PANEL_TITLE}>
        AI 服务配置
        {connected ? <span className={tagClass('mint')}>已连接</span> : null}
      </h2>

      <div className="flex flex-col gap-2.5">
        <FormField
          label="API Key"
          secret
          value={form.apiKey}
          onValueChange={(apiKey) => update({ apiKey })}
          placeholder="sk-..."
        />
        <FormField
          label="Base URL"
          value={form.baseUrl}
          onValueChange={(baseUrl) => update({ baseUrl })}
          placeholder="https://api.openai.com/v1"
        />
        <FormField
          label="模型名"
          value={form.model}
          onValueChange={(model) => update({ model })}
          placeholder="deepseek-chat"
        />
      </div>
      <p className={`mx-1 mt-2.5 ${CAPTION}`}>
        支持兼容 OpenAI 接口格式的服务。API Key 只存在本机的数据库里，不会发到别处。
      </p>

      <div className="mt-5">
        <p className={FIELD_LABEL}>思考模式</p>
        <Segment
          options={THINKING_OPTIONS}
          value={form.thinking}
          onChange={(thinking) => update({ thinking })}
          label="思考模式"
        />
      </div>
      <p className={`mx-1 mt-2 ${CAPTION}`}>{THINKING_HINT}</p>

      <div className="mt-[22px] flex items-center gap-2.5">
        <button
          type="button"
          disabled={!complete || !idle}
          onClick={() => void test(trimmed())}
          className={buttonClass('ghost')}
        >
          {busy === 'testing' ? '测试中…' : '测试连接'}
        </button>
        <button
          type="button"
          disabled={!complete || !idle}
          onClick={() => void save()}
          className={buttonClass('accent')}
        >
          {busy === 'saving' ? '保存中…' : '保存'}
        </button>
        {status && (
          <span
            role="status"
            className={`ml-auto min-w-0 text-right text-footnote font-bold ${
              status.ok ? 'text-success' : 'text-danger'
            }`}
          >
            {status.ok ? '✓ ' : '✗ '}
            {status.text}
          </span>
        )}
      </div>
    </section>
  );
}
