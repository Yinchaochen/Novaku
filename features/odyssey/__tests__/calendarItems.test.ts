/**
 * The calendar's merge and grouping rules (D-083).
 *
 * The device-merge dedupe is the one that will silently regress: a person
 * with the same appointment in Google Calendar and on Postervia must see it
 * once, and "same" is judged by day + title, case-insensitively — because
 * that is how the duplicate actually manifests.
 */

jest.mock('../../../lib/api', () => ({ api: { get: jest.fn() } }));

import { CalendarItem, dayKey, groupByDay, mergeDeviceEvents, monthRange } from '../calendarItems';

function item(overrides: Partial<CalendarItem>): CalendarItem {
  return {
    date: '2026-09-10T18:00:00.000Z',
    kind: 'event',
    title: 'Meetup',
    source: 'saved_post',
    ...overrides,
  };
}

describe('monthRange', () => {
  it('spans exactly the calendar month, end exclusive', () => {
    expect(monthRange(new Date(2026, 8, 15))).toEqual({ start: '2026-09-01', end: '2026-10-01' });
  });

  it('rolls over the year boundary', () => {
    expect(monthRange(new Date(2026, 11, 3))).toEqual({ start: '2026-12-01', end: '2027-01-01' });
  });
});

describe('groupByDay', () => {
  it('buckets by local day and sorts inside the day', () => {
    const later = item({ date: '2026-09-10T20:00:00.000Z', title: 'B' });
    const earlier = item({ date: '2026-09-10T08:00:00.000Z', title: 'A' });
    const grouped = groupByDay([later, earlier]);
    const key = dayKey(new Date('2026-09-10T12:00:00.000Z'));
    expect(grouped.get(key)?.map((i) => i.title)).toEqual(['A', 'B']);
  });

  it('an empty list yields an empty map', () => {
    expect(groupByDay([]).size).toBe(0);
  });
});

describe('mergeDeviceEvents', () => {
  it('keeps device events that are genuinely new', () => {
    const merged = mergeDeviceEvents(
      [item({ title: 'Anmeldung' })],
      [item({ title: 'Zahnarzt', source: 'device' })],
    );
    expect(merged.map((i) => i.title).sort()).toEqual(['Anmeldung', 'Zahnarzt']);
  });

  it('drops a device copy of something already on the server, whatever its casing', () => {
    const merged = mergeDeviceEvents(
      [item({ title: 'Founders Breakfast' })],
      [item({ title: 'founders breakfast', source: 'device' })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe('saved_post');
  });

  it('the same title on a different day is not a duplicate', () => {
    const merged = mergeDeviceEvents(
      [item({ title: 'Yoga' })],
      [item({ title: 'Yoga', date: '2026-09-11T18:00:00.000Z', source: 'device' })],
    );
    expect(merged).toHaveLength(2);
  });

  it('sorts the merged list chronologically', () => {
    const merged = mergeDeviceEvents(
      [item({ date: '2026-09-12T10:00:00.000Z', title: 'Später' })],
      [item({ date: '2026-09-11T10:00:00.000Z', title: 'Früher', source: 'device' })],
    );
    expect(merged.map((i) => i.title)).toEqual(['Früher', 'Später']);
  });
});
