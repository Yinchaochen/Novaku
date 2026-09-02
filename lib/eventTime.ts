/**
 * Pure date logic for the optional event clock a person attaches to a Plaza
 * post (D-104). Kept free of React Native imports so it unit-tests directly.
 *
 * Storage shape is two ISO strings (or nulls) matching the backend columns
 * `event_starts_at` / `event_ends_at`. Time is optional: an all-day event is a
 * start at the local day's beginning and an end at its close, and that is how
 * the card knows to print a date without a clock.
 */

export interface EventTimeValue {
  start: string | null;
  end: string | null;
}

export const EMPTY_EVENT_TIME: EventTimeValue = { start: null, end: null };

export interface EventTimeParts {
  startDay: Date;
  endDay: Date | null;
  /** Local wall-clock times, 24h. Null = all-day (no time given). */
  time: { startH: number; startM: number; endH: number; endM: number } | null;
}

function atTime(day: Date, h: number, m: number, s = 0, ms = 0): Date {
  const r = new Date(day);
  r.setHours(h, m, s, ms);
  return r;
}

/** Assemble the picked day(s) and optional times into stored ISO strings. */
export function buildEventTime(parts: EventTimeParts): EventTimeValue {
  const endDay = parts.endDay ?? parts.startDay;
  let start: Date;
  let end: Date;
  if (parts.time) {
    start = atTime(parts.startDay, parts.time.startH, parts.time.startM);
    end = atTime(endDay, parts.time.endH, parts.time.endM);
    // A same-day end before its start is nonsensical; the backend rejects it,
    // so never emit it — collapse to a single moment instead.
    if (end.getTime() < start.getTime()) {
      end = start;
    }
  } else {
    start = atTime(parts.startDay, 0, 0, 0, 0);
    end = atTime(endDay, 23, 59, 0, 0);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

/** All-day = the stored range sits on local day boundaries (00:00 → 23:59). */
export function isAllDay(startISO: string, endISO: string | null): boolean {
  const s = new Date(startISO);
  if (s.getHours() !== 0 || s.getMinutes() !== 0) {
    return false;
  }
  if (endISO == null) {
    return true;
  }
  const e = new Date(endISO);
  return e.getHours() === 23 && e.getMinutes() === 59;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Human summary for the composer chip and the feed card. Falls back to plain
 * locale strings if Intl throws for an exotic langCode (matches the Buddy
 * pickers' defensive formatting).
 */
export function formatEventTime(
  startISO: string,
  endISO: string | null,
  langCode: string,
): string {
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : null;
  const allDay = isAllDay(startISO, endISO);
  try {
    const dateFmt = new Intl.DateTimeFormat(langCode, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeFmt = new Intl.DateTimeFormat(langCode, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    if (allDay) {
      if (!end || sameDay(start, end)) {
        return dateFmt.format(start);
      }
      return `${dateFmt.format(start)} – ${dateFmt.format(end)}`;
    }
    if (!end) {
      return `${dateFmt.format(start)} · ${timeFmt.format(start)}`;
    }
    if (sameDay(start, end)) {
      return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
    }
    return `${dateFmt.format(start)} ${timeFmt.format(start)} – ${dateFmt.format(end)} ${timeFmt.format(end)}`;
  } catch {
    return end ? `${start.toLocaleString()} – ${end.toLocaleString()}` : start.toLocaleString();
  }
}
