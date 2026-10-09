import { describe, expect, it } from 'vitest';
import { formatRelative } from '../relativeTime';

const NOW = 1_800_000_000_000;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelative', () => {
  it('一分钟内是刚刚', () => {
    expect(formatRelative(NOW - 30 * 1000, NOW)).toBe('刚刚');
    expect(formatRelative(NOW, NOW)).toBe('刚刚');
  });

  it('分钟、小时、天各取整', () => {
    expect(formatRelative(NOW - 5 * MINUTE, NOW)).toBe('5 分钟前');
    expect(formatRelative(NOW - 59 * MINUTE, NOW)).toBe('59 分钟前');
    expect(formatRelative(NOW - 3 * HOUR, NOW)).toBe('3 小时前');
    expect(formatRelative(NOW - 2 * DAY, NOW)).toBe('2 天前');
    expect(formatRelative(NOW - 29 * DAY, NOW)).toBe('29 天前');
  });

  it('超过 30 天显示日期', () => {
    const old = NOW - 60 * DAY;
    expect(formatRelative(old, NOW)).toBe(new Date(old).toLocaleDateString());
  });
});
