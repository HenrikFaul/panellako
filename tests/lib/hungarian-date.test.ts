import { describe, expect, it } from 'vitest';
import {
  formatHungarianDate,
  formatHungarianDateTime,
  formatHungarianMonthDay,
  getHungarianDateKey,
} from '../../lib/hungarian-date';

describe('Hungarian date rendering', () => {
  it('uses the Budapest timezone for SSR-safe date and time text', () => {
    const instant = '2026-05-16T03:59:00.000Z';

    expect(formatHungarianDate(instant)).toBe('2026. máj. 16.');
    expect(formatHungarianDateTime(instant)).toBe('2026. máj. 16. 5:59');
    expect(formatHungarianMonthDay(instant)).toBe('máj. 16.');
  });

  it('keeps the Hungarian date across the UTC midnight boundary', () => {
    const instant = '2026-08-26T22:30:00.000Z';

    expect(getHungarianDateKey(instant)).toBe('2026-08-27');
    expect(formatHungarianDate(instant)).toBe('2026. aug. 27.');
  });

  it('preserves the existing empty-value fallback', () => {
    expect(formatHungarianDate(null)).toBe('-');
    expect(formatHungarianDateTime(undefined)).toBe('-');
    expect(formatHungarianMonthDay(null)).toBe('-');
  });
});
