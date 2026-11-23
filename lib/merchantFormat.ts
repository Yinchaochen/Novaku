import type { OpeningHours, OpeningRange, Weekday } from '../features/merchants/types';
import { WEEKDAYS } from '../features/merchants/types';

export const MAX_PRICE_CENTS = 10_000_000;

/** "2.40", "2,40", "2" → cents; "" → null (ask in the shop); anything else → undefined. */
export function parsePriceInput(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const match = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(trimmed);
  if (!match) {
    return undefined;
  }
  const euros = Number(match[1]);
  const cents = match[2] ? Number(match[2].padEnd(2, '0')) : 0;
  const total = euros * 100 + cents;
  return total <= MAX_PRICE_CENTS ? total : undefined;
}

export function priceInputFromCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '';
  }
  return (cents / 100).toFixed(2);
}

export function formatPrice(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function defaultOpeningHours(): OpeningHours {
  const workday: OpeningRange[] = [{ open: '09:00', close: '18:00' }];
  return {
    mon: [...workday],
    tue: [...workday],
    wed: [...workday],
    thu: [...workday],
    fri: [...workday],
    sat: [...workday],
    sun: [],
  };
}

export type HoursGroup = { days: Weekday[]; ranges: OpeningRange[] };

function sameRanges(a: OpeningRange[], b: OpeningRange[]): boolean {
  return a.length === b.length && a.every((range, index) => range.open === b[index].open && range.close === b[index].close);
}

/** Consecutive days with the same hours collapse into one row: Mon–Fri 07:00–18:00. */
export function groupOpeningHours(hours: Partial<OpeningHours> | null | undefined): HoursGroup[] {
  const groups: HoursGroup[] = [];
  for (const day of WEEKDAYS) {
    const ranges = hours?.[day] ?? [];
    const last = groups[groups.length - 1];
    if (last && sameRanges(last.ranges, ranges)) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], ranges: [...ranges] });
    }
  }
  return groups;
}

export function formatRanges(ranges: OpeningRange[]): string {
  return ranges.map((range) => `${range.open}–${range.close}`).join(', ');
}

/** Minutes since midnight; "24:00" is 1440. */
export function minutesOf(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

export function hhmm(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** "March 2019" in the reader's language, for a shop's opening month (D-200). */
export function formatOpenedMonth(year: number, month: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(new Date(year, month - 1, 1));
  } catch {
    return `${month}/${year}`;
  }
}
