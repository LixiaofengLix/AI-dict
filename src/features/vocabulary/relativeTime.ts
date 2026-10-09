const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前；超过 30 天显示日期 */
export function formatRelative(ts: number, now: number = Date.now()): string {
  const diff = now - ts;
  if (diff < MINUTE) {
    return '刚刚';
  }
  if (diff < HOUR) {
    return `${Math.floor(diff / MINUTE)} 分钟前`;
  }
  if (diff < DAY) {
    return `${Math.floor(diff / HOUR)} 小时前`;
  }
  if (diff < 30 * DAY) {
    return `${Math.floor(diff / DAY)} 天前`;
  }
  return new Date(ts).toLocaleDateString();
}
