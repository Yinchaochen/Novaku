/**
 * Helpers for building + repairing Google Maps URLs.
 *
 * The Google Maps app on iOS / Android only navigates to a place when the
 * URL follows the documented Maps URLs API:
 *   https://developers.google.com/maps/documentation/urls/get-started
 *
 * Anything else (e.g. the legacy `/maps/place/?q=place_id:XYZ` form) gets
 * dropped into the Maps search box as a literal string — exactly the bug
 * users were seeing on the location badge.
 */

export function buildPlaceUrl(
  name: string | null | undefined,
  latitude: number,
  longitude: number,
  placeId: string | null | undefined,
): string {
  const trimmedName = (name ?? '').trim();
  if (placeId && trimmedName) {
    const query = encodeURIComponent(trimmedName);
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * Rewrites legacy / malformed Google Maps URLs so the Maps app navigates to
 * the place instead of stuffing the URL into its search box. Returns the URL
 * unchanged when it's already valid or isn't a Google Maps URL at all.
 *
 * `fallbackQuery` provides a readable label for legacy URLs that only had a
 * place_id — Maps requires `query` alongside `query_place_id`.
 */
export function normalizeMapUrl(
  url: string | null | undefined,
  fallbackQuery?: string | null,
): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const host = parsed.hostname.toLowerCase();
  if (host !== 'www.google.com' && host !== 'maps.google.com' && host !== 'google.com') {
    return url;
  }
  if (parsed.pathname.startsWith('/maps/place/')) {
    const q = parsed.searchParams.get('q');
    if (q && q.startsWith('place_id:')) {
      const placeId = q.slice('place_id:'.length).trim();
      if (placeId) {
        const labelSource = (fallbackQuery ?? '').trim() || placeId;
        const query = encodeURIComponent(labelSource);
        return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${placeId}`;
      }
    }
  }
  return url;
}
