import { buildEventTime, formatEventTime, isAllDay } from '../eventTime';

// Construct local-zone days so the tests are independent of the runner's TZ:
// buildEventTime reads local wall-clock, and the assertions read it back the
// same way.
function day(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

describe('buildEventTime', () => {
  it('all-day single day spans local 00:00 to 23:59', () => {
    const { start, end } = buildEventTime({ startDay: day(2026, 10, 3), endDay: null, time: null });
    const s = new Date(start!);
    const e = new Date(end!);
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
    expect(e.getHours()).toBe(23);
    expect(e.getMinutes()).toBe(59);
    expect(isAllDay(start!, end)).toBe(true);
  });

  it('timed event keeps the wall-clock times given', () => {
    const { start, end } = buildEventTime({
      startDay: day(2026, 10, 3),
      endDay: null,
      time: { startH: 15, startM: 0, endH: 17, endM: 30 },
    });
    expect(new Date(start!).getHours()).toBe(15);
    expect(new Date(end!).getMinutes()).toBe(30);
    expect(isAllDay(start!, end)).toBe(false);
  });

  it('never emits an end before its start', () => {
    const { start, end } = buildEventTime({
      startDay: day(2026, 10, 3),
      endDay: null,
      time: { startH: 18, startM: 0, endH: 9, endM: 0 },
    });
    expect(new Date(end!).getTime()).toBeGreaterThanOrEqual(new Date(start!).getTime());
  });

  it('carries a multi-day all-day range to the last day', () => {
    const { start, end } = buildEventTime({
      startDay: day(2026, 10, 3),
      endDay: day(2026, 10, 5),
      time: null,
    });
    expect(new Date(start!).getDate()).toBe(3);
    expect(new Date(end!).getDate()).toBe(5);
  });
});

describe('formatEventTime', () => {
  it('all-day single day shows a date with no clock', () => {
    const { start, end } = buildEventTime({ startDay: day(2026, 10, 3), endDay: null, time: null });
    const text = formatEventTime(start!, end, 'en-US');
    expect(text).not.toMatch(/\d{1,2}:\d{2}/); // no HH:MM
    expect(text).toMatch(/Oct/);
  });

  it('timed same-day shows a start–end clock', () => {
    const { start, end } = buildEventTime({
      startDay: day(2026, 10, 3),
      endDay: null,
      time: { startH: 15, startM: 0, endH: 17, endM: 0 },
    });
    const text = formatEventTime(start!, end, 'en-US');
    expect(text).toMatch(/–/);
    expect(text).toMatch(/\d{1,2}:\d{2}/);
  });

  it('falls back without throwing on an exotic locale', () => {
    const { start, end } = buildEventTime({ startDay: day(2026, 10, 3), endDay: null, time: null });
    expect(() => formatEventTime(start!, end, 'zz-ZZ')).not.toThrow();
  });
});
