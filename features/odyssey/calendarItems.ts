import { api } from '../../lib/api';

/**
 * The Odyssey calendar's data shapes and pure helpers (D-083).
 *
 * Two feeds meet here: the backend's dated saved items, and — when the user
 * connects it — the phone's own calendar, which is where their Google
 * Calendar already lives on both platforms. Device events never leave the
 * device: they are merged locally, marked `source: 'device'`, and are not
 * sent anywhere.
 */

export interface CalendarItem {
  date: string; // ISO datetime
  kind: 'event' | 'deadline';
  title: string;
  source: 'saved_post' | 'personal_task' | 'group_event' | 'device';
  post_id?: string | null;
  personal_odyssey_id?: string | null;
  group_id?: string | null;
}

/** Local calendar-day key, matching CalendarMonth's marking format. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function monthRange(month: Date): { start: string; end: string } {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  return { start: iso(start), end: iso(end) };
}

export function groupByDay(items: CalendarItem[]): Map<string, CalendarItem[]> {
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = dayKey(new Date(item.date));
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      byDay.set(key, [item]);
    }
  }
  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  return byDay;
}

/**
 * Merge device-calendar events into the server items. Sorted by time; a
 * device event that repeats a server one (same title, same day) is dropped —
 * people add the same appointment in both places, and seeing it twice reads
 * as a bug in ours.
 */
export function mergeDeviceEvents(
  server: CalendarItem[],
  device: CalendarItem[],
): CalendarItem[] {
  const seen = new Set(
    server.map((i) => `${dayKey(new Date(i.date))}|${i.title.trim().toLowerCase()}`),
  );
  const fresh = device.filter(
    (i) => !seen.has(`${dayKey(new Date(i.date))}|${i.title.trim().toLowerCase()}`),
  );
  return [...server, ...fresh].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export async function fetchCalendarItems(month: Date): Promise<CalendarItem[]> {
  const { start, end } = monthRange(month);
  const res = await api.get('/odyssey/calendar', { params: { start, end } });
  return res.data.data as CalendarItem[];
}
