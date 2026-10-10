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
import {
  DEFAULT_INSTRUCTIONS,
  lockedPreview,
  PROMPT_MODES,
} from '../../services/ai/prompts/registry';
import { getAccent, getPromptOverrides, setPromptOverrides } from '../../services/settings';
import type { Accent, PromptKind, PromptOverrides } from '../../types/settings';

type Drafts = Record<PromptKind, string>;

const OPTIONS = PROMPT_MODES.map(({ kind, label }) => ({ value: kind, label }));

/** 和默认一样或清空了的不存，下次读到的就是默认 */
function toOverrides(drafts: Drafts): PromptOverrides {
  const overrides: PromptOverrides = {};
  for (const { kind } of PROMPT_MODES) {
    const text = drafts[kind].trim();
    if (text && text !== DEFAULT_INSTRUCTIONS[kind]) {
      overrides[kind] = text;
    }
  }
  return overrides;
}

function toDrafts(overrides: PromptOverrides): Drafts {
  return { ...DEFAULT_INSTRUCTIONS, ...overrides };
}

/**
 * 设置页的提示词区：按模式改提示词里"可改的部分"（角色、风格、内容要求）。
 * 输出格式那部分界面要靠它解析，只展示不让改。保存后下一次请求生效。
 */
export function PromptsSection() {
  const [saved, setSaved] = useState<Drafts | null>(null);
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [accent, setAccent] = useState<Accent>('us');
  const [kind, setKind] = useState<PromptKind>('contextMeaning');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getPromptOverrides(), getAccent()])
      .then(([overrides, value]) => {
        if (!alive) return;
        const initial = toDrafts(overrides);
        setSaved(initial);
        setDrafts(initial);
        setAccent(value);
      })
      .catch((error: unknown) => {
        console.warn('读取提示词设置失败', error);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!saved || !drafts) {
    return (
      <section className={PANEL.plain}>
        <h2 className={PANEL_TITLE}>提示词</h2>
        <p className={CAPTION}>正在读取…</p>
      </section>
    );
  }

  const mode = PROMPT_MODES.find((m) => m.kind === kind) ?? PROMPT_MODES[0];
  const draft = drafts[kind];
  const customized = draft.trim() !== DEFAULT_INSTRUCTIONS[kind] && draft.trim() !== '';
  const dirty = PROMPT_MODES.some((m) => drafts[m.kind] !== saved[m.kind]);

  const edit = (text: string) => {
    setDrafts({ ...drafts, [kind]: text });
    setStatus(null);
  };

  const save = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const overrides = toOverrides(drafts);
      await setPromptOverrides(overrides);
      const next = toDrafts(overrides);
      setSaved(next);
      setDrafts(next);
      setStatus({ ok: true, text: '已保存，下次查询生效' });
    } catch (error: unknown) {
      console.error('保存提示词失败', error);
      setStatus({ ok: false, text: '保存失败，请重试' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={PANEL.plain}>
      <h2 className={PANEL_TITLE}>
        提示词
        {customized ? <span className={tagClass('orange')}>已自定义</span> : null}
      </h2>

      <Segment options={OPTIONS} value={kind} onChange={setKind} label="提示词模式" />

      <div className="mt-4 grid grid-cols-2 gap-[22px]">
        <div className="flex min-w-0 flex-col">
          <label htmlFor="prompt-instruction" className={FIELD_LABEL}>
            可修改的部分
          </label>
          <textarea
            id="prompt-instruction"
            value={draft}
            onChange={(event) => edit(event.target.value)}
            spellCheck={false}
            rows={12}
            className="scroll-thin w-full flex-1 resize-none rounded-inner border border-line bg-soft px-3 py-2.5 text-footnote leading-[1.6] text-ink outline-none focus:border-ink"
          />
          <p className={`mx-1 mt-2 ${CAPTION}`}>
            角色、风格和内容要求，作为 system 消息发送。
            {mode.placeholders ? `${mode.placeholders}。` : ''}清空等于用默认。
          </p>
        </div>

        <div className="flex min-w-0 flex-col">
          <p className={FIELD_LABEL}>固定的格式（不可修改）</p>
          <pre className="scroll-thin max-h-[260px] flex-1 overflow-auto rounded-inner border border-line-quiet bg-surface px-3 py-2.5 text-footnote leading-[1.6] whitespace-pre-wrap text-ink-soft select-text">
            {lockedPreview(kind, accent)}
          </pre>
          <p className={`mx-1 mt-2 ${CAPTION}`}>
            输入内容和输出格式，作为 user 消息发送。界面按这个格式解析结果，所以不开放修改。
          </p>
        </div>
      </div>

      <div className="mt-[18px] flex items-center gap-2.5">
        <button
          type="button"
          disabled={!customized}
          onClick={() => edit(DEFAULT_INSTRUCTIONS[kind])}
          className={buttonClass('ghost')}
        >
          恢复默认
        </button>
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={() => void save()}
          className={buttonClass('accent')}
        >
          {busy ? '保存中…' : '保存'}
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
