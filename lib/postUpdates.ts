/**
 * What changed at a post's source since it was published (D-171), as the
 * backend reports it. Pure, so it unit-tests without React Native.
 *
 * The body keeps the words it was published with, old date included; the
 * banner and the card tag are how a reader learns which value is current.
 */

export type InfoUpdateKind = 'time' | 'place' | 'deadline' | 'cancelled' | 'gone';

export interface InfoUpdate {
  kind: InfoUpdateKind;
  at: string | null;
  before: { starts_at?: string; deadline?: string; venue?: string; address?: string; timed?: boolean };
  after: { starts_at?: string; deadline?: string; venue?: string; address?: string; timed?: boolean };
  page_url?: string | null;
}

export interface PostWithUpdates {
  info_update_kind?: string | null;
  info_updated_at?: string | null;
  info_updates?: InfoUpdate[] | null;
}

const KINDS: InfoUpdateKind[] = ['time', 'place', 'deadline', 'cancelled', 'gone'];
/** How long a time, place or deadline change keeps its tag on the card. */
export const TAG_DAYS = 14;

function kindOf(value: string | null | undefined): InfoUpdateKind | null {
  return KINDS.includes(value as InfoUpdateKind) ? (value as InfoUpdateKind) : null;
}

/** The tag a feed card shows, if any. Cancelled and gone stay; the rest fade. */
export function cardTag(post: PostWithUpdates, now: Date = new Date()): InfoUpdateKind | null {
  const kind = kindOf(post.info_update_kind);
  if (!kind) return null;
  if (kind === 'cancelled' || kind === 'gone') return kind;
  if (!post.info_updated_at) return null;
  const age = now.getTime() - new Date(post.info_updated_at).getTime();
  return age <= TAG_DAYS * 24 * 3600 * 1000 ? kind : null;
}

/**
 * Whether the post's own words may name a value that no longer holds. True
 * for good once a source changed the time, place or deadline: the body is
 * never rewritten, so the cover must not lift a dated sentence out of it.
 */
export function bodyMayBeStale(post: PostWithUpdates): boolean {
  return kindOf(post.info_update_kind) !== null;
}

/** The banner's items, newest first; empty when there is nothing to say.
 *  A cancellation is always explained, even when the backend's window has
 *  dropped the change that recorded it. */
export function bannerItems(post: PostWithUpdates): InfoUpdate[] {
  const items = (post.info_updates ?? []).filter((item) => kindOf(item.kind) !== null);
  if (post.info_update_kind === 'cancelled' && !items.some((item) => item.kind === 'cancelled')) {
    items.unshift({ kind: 'cancelled', at: post.info_updated_at ?? null, before: {}, after: {} });
  }
  return items;
}

/**
 * A deadline stored at 23:59 UTC means "the whole day" (parse_apply_by and
 * the web checker write 23:59:59, the hand-written posts 23:59:00): show the
 * day, never a clock that would read as 01:59 the next morning in Berlin.
 * Same rule as the backend's post_sources/dates.py.
 */
export function formatDeadline(iso: string, langCode: string): string {
  const moment = new Date(iso);
  const wholeDay = moment.getUTCHours() === 23 && moment.getUTCMinutes() === 59;
  try {
    if (wholeDay) {
      return new Intl.DateTimeFormat(langCode, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(moment);
    }
    return new Intl.DateTimeFormat(langCode, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(moment);
  } catch {
    return wholeDay ? moment.toISOString().slice(0, 10) : moment.toLocaleString();
  }
}

/** "Venue, Address" without repeating a venue that is already the address. */
export function placeLine(value: InfoUpdate['after']): string {
  const venue = (value.venue ?? '').trim();
  const address = (value.address ?? '').trim();
  if (venue && address && !address.toLowerCase().includes(venue.toLowerCase())) {
    return `${venue}, ${address}`;
  }
  return venue || address;
}

/**
 * An event start for the banner. A start without a clock is stored as 00:00
 * Berlin; showing it in the phone's own zone would print a time nobody set.
 */
export function formatStart(iso: string, timed: boolean | undefined, langCode: string): string {
  const moment = new Date(iso);
  try {
    if (timed === false) {
      return new Intl.DateTimeFormat(langCode, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'Europe/Berlin',
      }).format(moment);
    }
    return new Intl.DateTimeFormat(langCode, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(moment);
  } catch {
    return moment.toLocaleString();
  }
}
