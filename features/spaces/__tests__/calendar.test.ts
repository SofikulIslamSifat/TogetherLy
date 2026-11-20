import { describe, expect, it, jest } from '@jest/globals';
import {
  getAnnualOccurrenceDate,
  getCalendarGridDates,
  getCalendarDateKey,
  isValidCalendarDate,
} from '@/features/spaces/calendar';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('shared calendar dates', () => {
  it('builds a Monday-first six-week calendar grid', () => {
    const dates = getCalendarGridDates(new Date(2026, 10, 1));
    expect(dates).toHaveLength(42);
    expect(dates[0]).toBe('2026-10-26');
    expect(dates[6]).toBe('2026-11-01');
    expect(dates[41]).toBe('2026-12-06');
  });

  it('rejects invalid dates and maps annual events to valid occurrences only', () => {
    expect(isValidCalendarDate('2026-02-29')).toBe(false);
    expect(isValidCalendarDate('2028-02-29')).toBe(true);
    expect(getAnnualOccurrenceDate('2000-02-29', 2028)).toBe('2028-02-29');
    expect(getAnnualOccurrenceDate('2000-02-29', 2027)).toBeNull();
  });

  it('formats date keys using the local calendar date', () => {
    expect(getCalendarDateKey(new Date(2026, 10, 23, 23, 30))).toBe('2026-11-23');
  });
});
