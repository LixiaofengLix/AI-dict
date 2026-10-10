import { useEffect, useState } from 'react';
import { Switch } from '../../components/Switch';
import { buttonClass, CAPTION, PANEL, PANEL_TITLE } from '../../components/styles';
import { getOcrConfig, setOcrConfig } from '../../services/settings';
import type { OcrConfig } from '../../types/settings';
import { FormField } from './components/FormField';

/** 保存的结果提示 */
type Status = { ok: boolean; text: string };

/**
 * AI 设置页的「截图识别」块（9.3）：云 OCR 是可勾选项，勾了才显示百度的两个 Key。
 * 系统 OCR 一直是兜底，不在这里配置。
 */
export function OcrSection() {
  const [initial, setInitial] = useState<OcrConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getOcrConfig().then((config) => {
      if (!cancelled) {
        setInitial(config);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 和 AI 配置一样：读到已保存的配置后再挂载表单，输入框的初始值才正确
  return initial ? (
    <OcrForm initial={initial} />
  ) : (
    <section className={PANEL.plain}>
      <h2 className={PANEL_TITLE}>截图识别</h2>
      <p className={CAPTION}>正在读取配置…</p>
    </section>
  );
}

function OcrForm({ initial }: { initial: OcrConfig }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const update = (patch: Partial<OcrConfig>) => {
    setForm((f) => ({ ...f, ...patch }));
    // 改了配置，之前的"已保存"不再适用
    setStatus(null);
  };

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await setOcrConfig({
        baidu: form.baidu,
        baiduApiKey: form.baiduApiKey.trim(),
        baiduSecretKey: form.baiduSecretKey.trim(),
      });
      setStatus({ ok: true, text: '已保存' });
    } catch (error: unknown) {
      console.error('保存截图识别配置失败', error);
      setStatus({ ok: false, text: '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={PANEL.plain}>
      <h2 className={PANEL_TITLE}>截图识别</h2>
      <p className={CAPTION}>
        截图后先按这里开的识别方式认字，失败时自动降回系统 OCR：它离线可用、不花钱，
        但中文和屏幕小字容易认错，推荐开云 OCR。
      </p>

      <label className="mt-3 flex items-center justify-between gap-4">
        <span>
          <span className="block text-[13px] font-bold text-ink">百度高精度云 OCR</span>
          <span className={`block ${CAPTION}`}>联网把截图发给百度识别，中英混排更准</span>
        </span>
        <Switch
          label="百度高精度云 OCR"
          checked={form.baidu}
          onChange={(baidu) => update({ baidu })}
        />
      </label>

      {form.baidu && (
        <div className="mt-3 flex flex-col gap-2.5">
          <FormField
            label="API Key"
            secret
            value={form.baiduApiKey}
            onValueChange={(baiduApiKey) => update({ baiduApiKey })}
          />
          <FormField
            label="Secret Key"
            secret
            value={form.baiduSecretKey}
            onValueChange={(baiduSecretKey) => update({ baiduSecretKey })}
          />
          <p className={`mx-1 ${CAPTION}`}>
            在百度智能云控制台开通「文字识别」并创建应用，两个 Key 都填了才会走云 OCR。
            换取来的 token 存在本机，30 天内不用重复换。
          </p>
        </div>
      )}

      <div className="mt-[22px] flex items-center gap-2.5">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className={buttonClass('accent')}
        >
          {saving ? '保存中…' : '保存'}
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
