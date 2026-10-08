import { useEffect, useState } from 'react';
import { aiImpl } from '../../services/ai/impl';
import { getAiConfig, setAiConfig } from '../../services/settings';
import type { AiConfig, ThinkingMode } from '../../types/ai';
import { FormField } from './components/FormField';

const THINKING_OPTIONS: readonly { value: ThinkingMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
  { value: 'max', label: 'Max' },
];

const THINKING_HINT =
  'DeepSeek 的思考强度，None 为关闭思考。开启后模型先思考再回答，结果更严谨但慢很多；' +
  '查词、翻译建议选 None。';

/** 测试连接、保存的结果提示 */
type Status = { ok: boolean; text: string };

// AI 配置页（3.4）：Base URL、模型、API Key、思考模式、测试连接。交互照 ReadingBook 的 AiConfigScreen
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

  // 读到已保存的配置后再挂载表单，输入框的初始值才正确
  if (!initial) {
    return <p className="px-5 py-6 text-callout text-ink-soft">正在读取配置…</p>;
  }
  return <AiConfigForm initial={initial} />;
}

function AiConfigForm({ initial }: { initial: AiConfig }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState<'testing' | 'saving' | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const complete = Boolean(form.apiKey.trim() && form.baseUrl.trim() && form.model.trim());

  const update = (patch: Partial<AiConfig>) => {
    setForm((f) => ({ ...f, ...patch }));
    // 改了配置，之前的测试结果和"已保存"都不再适用
    setStatus(null);
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
    <div className="mx-auto max-w-xl px-5 py-6">
      <h1 className="text-title font-semibold text-ink">AI 服务配置</h1>

      <div className="mt-4 flex flex-col gap-4 rounded-card bg-surface p-4 shadow-card">
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
      <p className="mt-2 px-1 text-caption leading-relaxed text-ink-soft">
        支持兼容 OpenAI 接口格式的服务。API Key 只存在本机的数据库里，不会发到别处。
      </p>

      <div className="mt-5 rounded-card bg-surface p-4 shadow-card">
        <p className="text-footnote text-ink-body">思考模式</p>
        <div
          role="radiogroup"
          aria-label="思考模式"
          className="mt-2 grid grid-cols-4 gap-1 rounded-field bg-segment p-1"
        >
          {THINKING_OPTIONS.map(({ value, label }) => {
            const selected = form.thinking === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ thinking: value })}
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
      <p className="mt-2 px-1 text-caption leading-relaxed text-ink-soft">{THINKING_HINT}</p>

      {status && (
        <p
          role="status"
          className={`mt-5 flex items-center gap-2 text-callout ${
            status.ok ? 'text-success' : 'text-danger'
          }`}
        >
          <span aria-hidden>{status.ok ? '✓' : '✗'}</span>
          {status.text}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          disabled={!complete || !idle}
          onClick={() => void test(trimmed())}
          className="flex-1 rounded-field border border-line bg-surface py-2.5 text-callout font-medium text-ink-body hover:text-ink disabled:opacity-40"
        >
          {busy === 'testing' ? '测试中…' : '测试连接'}
        </button>
        <button
          type="button"
          disabled={!complete || !idle}
          onClick={() => void save()}
          className="flex-1 rounded-field bg-primary py-2.5 text-callout font-medium text-on-primary disabled:opacity-40"
        >
          {busy === 'saving' ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
}
