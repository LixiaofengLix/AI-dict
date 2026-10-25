/**
 * 界面里反复出现的几种零件的样式。
 * 只放 className 字符串；结构稍复杂的零件（区块标题、分段控件）是单独的组件。
 */

type ButtonVariant = 'dark' | 'accent' | 'ghost' | 'quiet' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  dark: 'bg-ink text-surface hover:opacity-90',
  accent: 'bg-primary text-on-primary hover:opacity-90',
  ghost: 'border-2 border-ink bg-surface text-ink hover:bg-soft',
  quiet: 'bg-segment text-ink hover:opacity-90',
  danger: 'bg-danger text-on-primary hover:opacity-90',
};

/** 胶囊按钮（样张 .btn / .btn-sm） */
export function buttonClass(variant: ButtonVariant, size: 'md' | 'sm' = 'md'): string {
  const sizing = size === 'sm' ? 'px-3 py-[5px] text-footnote' : 'px-[18px] py-2 text-[13px]';
  return `rounded-full font-bold whitespace-nowrap disabled:cursor-default disabled:opacity-40 ${sizing} ${BUTTON_VARIANTS[variant]}`;
}

type TagTone = 'plain' | 'mint' | 'orange' | 'dark';

const TAG_TONES: Record<TagTone, string> = {
  plain: 'bg-segment text-ink',
  mint: 'bg-mint-soft text-success',
  orange: 'bg-primary-soft text-primary-ink',
  dark: 'bg-ink text-surface',
};

/** 小标签（样张 .tag） */
export function tagClass(tone: TagTone = 'plain'): string {
  return `inline-flex items-center gap-[5px] rounded-full px-[9px] py-[3px] text-caption font-bold whitespace-nowrap ${TAG_TONES[tone]}`;
}

/** 卡片（样张 .card 和它的几个变体） */
export const CARD = {
  plain: 'rounded-inner border border-line bg-surface px-3 py-2.5',
  soft: 'rounded-inner border border-line bg-soft px-3 py-2.5',
  quiet: 'rounded-inner border border-line-quiet bg-surface px-3 py-2.5',
  /** 重点卡：黑色粗描边 */
  feature: 'rounded-feature border-[2.5px] border-ink bg-surface px-3 py-2.5 shadow-solid',
  /** 黑底白字：译文、语境释义 */
  dark: 'rounded-feature border border-ink bg-ink px-3 py-2.5 text-surface shadow-solid',
} as const;

/** 设置页的大块（样张 .panel / .panel.feature） */
export const PANEL = {
  plain: 'rounded-card border border-line bg-surface px-[18px] py-4 shadow-card',
  feature: 'rounded-card border-[2.5px] border-ink bg-surface px-[18px] py-4 shadow-solid',
} as const;

/** 设置页大块的标题（样张 .panel h3） */
export const PANEL_TITLE =
  'mb-3 flex items-center gap-2.5 text-[16px] font-extrabold tracking-[-0.02em] text-ink';

/** 列表里的一条释义（样张 .sense）：条与条之间一条细线，首尾不留白 */
export const SENSE = 'border-b border-line py-2 first:pt-0 last:border-b-0 last:pb-0';

/** 词头标题（样张 .word-head h2）：句子模式和生词详情里小一号（20px），单词模式 22px */
export function wordTitleClass(compact: boolean): string {
  return `flex min-w-0 items-center gap-[7px] font-extrabold tracking-[-0.03em] whitespace-nowrap text-ink ${
    compact ? 'text-[20px]' : 'text-title'
  }`;
}

/** 空状态、失败页里的大标题（样张 .center h3） */
export const CENTER_TITLE = 'text-[18px] font-extrabold tracking-[-0.02em] text-ink';

/** 说明文字（样张 .t-cap） */
export const CAPTION = 'text-caption leading-[1.55] text-ink-soft';

/** 胶囊输入框（样张 .pill-field / .search） */
export const PILL_FIELD =
  'w-full rounded-full border border-line bg-soft px-3.5 py-2 text-[13px] text-ink outline-none placeholder:text-ink-soft focus:border-ink';

/** 设置页字段上面的小标题（样张 .fl） */
export const FIELD_LABEL =
  'mb-1 ml-1 block text-[10.5px] font-bold tracking-[0.04em] text-ink-soft uppercase';

/** 可滚动的内容区（样张 .scroll）：滚动条贴着窗口右边 */
export const SCROLL_AREA =
  'scroll-thin -mr-2 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-2';
