import { Caret } from '../../../components/Caret';
import { SectionLabel } from '../../../components/SectionLabel';
import { CARD } from '../../../components/styles';
import { splitBold } from '../../sentence/parseSections';

type Props = {
  /** 流式输出中的部分文本；null 表示首包还没到 */
  meaning: string | null;
  /** 失败原因；中途失败时 meaning 保留已输出的部分 */
  error?: string | null;
  onRetry?: () => void;
  /** 整段的译文（样张 02 卡片下半截那行「译文：…」）；还没出来就不显示 */
  translation?: string;
};

/**
 * 语境释义卡片（5.3，样张 02）：这个词在点它的那句话里是什么意思，黑底白字，
 * 下面带一行整段的译文。首包没到时只有一个闪烁的光标；失败给原因和小号重试。
 */
export function ContextCard({ meaning, error = null, onRetry, translation = '' }: Props) {
  return (
    <section className="shrink-0">
      <SectionLabel title="语境释义" />
      <div className={CARD.dark}>
        {meaning ? (
          <p className="text-body leading-[1.65] break-words">
            {splitBold(meaning).map((part, index) =>
              part.bold ? (
                <b key={index} className="font-bold">
                  {part.text}
                </b>
              ) : (
                <span key={index}>{part.text}</span>
              ),
            )}
          </p>
        ) : error ? null : (
          <p className="text-body leading-[1.65]">
            <Caret />
          </p>
        )}
        {error ? (
          <div className={`flex items-center justify-between gap-3 ${meaning ? 'mt-2' : ''}`}>
            <p className="text-callout text-ink-soft">{error}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="shrink-0 text-callout font-bold text-primary hover:underline"
              >
                重试
              </button>
            ) : null}
          </div>
        ) : null}
        {translation ? (
          <p className="mt-2 border-t border-surface/16 pt-2 text-body leading-[1.65] break-words">
            <span className="mr-1 font-bold text-ink-soft">译文：</span>
            {translation}
          </p>
        ) : null}
      </div>
    </section>
  );
}
