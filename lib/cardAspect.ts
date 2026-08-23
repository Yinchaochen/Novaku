/**
 * How tall a feed card's picture may be, relative to its width.
 *
 * Cards used to take their height from a hash of the post id and crop the
 * image to fill it. For a photograph that is fine; for an event poster — wide,
 * and mostly words — it cut the text in half, and the only way to find out
 * what the poster said was to open the post.
 *
 * Sizing to the image instead keeps posters readable. The bounds exist because
 * an unbounded ratio is its own problem: a 5:1 banner becomes a sliver, and a
 * very tall image pushes the next card off the screen. Anything outside them
 * is still cropped — that is the honest trade, not an oversight.
 */
export const MIN_CARD_ASPECT = 0.72;
export const MAX_CARD_ASPECT = 1.9;

/** Usable width/height for a card image, or null when the size is unusable. */
export function clampAspect(width: number, height: number): number | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return Math.min(MAX_CARD_ASPECT, Math.max(MIN_CARD_ASPECT, width / height));
}

/**
 * The same idea on a post's detail page, where the rules are different.
 *
 * A card is a preview and may crop; the detail page is where the reader went
 * to actually read the poster, so nothing may be cut there. The frame follows
 * the picture over a wider range and the image is drawn with `contain`, so an
 * image outside even these bounds is letterboxed rather than trimmed.
 */
export const MIN_DETAIL_ASPECT = 0.5;
export const MAX_DETAIL_ASPECT = 2.2;

/** Height in px for a full-bleed detail image, or null when size is unusable. */
export function detailMediaHeight(
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
): number | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }
  const aspect = Math.min(MAX_DETAIL_ASPECT, Math.max(MIN_DETAIL_ASPECT, width / height));
  // Leave room for the title and the opening lines of the body: an image that
  // fills the screen reads as the whole post and readers stop scrolling.
  return Math.min(Math.round(viewportWidth / aspect), Math.round(viewportHeight * 0.62));
}

/**
 * The aspect ratio a feed card reserves for its picture, decided before the
 * first render (D-074).
 *
 * Measuring the image with `onLoad` and then resizing was right about the
 * picture and wrong about the list. In a masonry column a card that grows
 * after layout pushes everything beneath it down, and since images arrive at
 * different moments the whole feed twitches while you scroll — which is what
 * lisum filmed on 2026-08-24.
 *
 * So the ratio must be known before layout. When the media carries its own
 * dimensions there is nothing to guess and nothing is cropped. When it does
 * not — older rows, and hotlinked covers — we fall back to a *stable* guess
 * derived from the post id: wrong for that picture, but the same wrong value
 * on every render, which is what keeps the column still.
 */
export function cardAspectFor(
  media: { width?: number | null; height?: number | null } | undefined,
  postId: string,
): number {
  const known = media?.width && media?.height ? clampAspect(media.width, media.height) : null;
  if (known !== null) {
    return known;
  }
  // Three ratios rather than one: a masonry column of identical cards reads
  // as a table. Portrait-leaning, because most feed photos are.
  const seed = postId.charCodeAt(0) % 3;
  return seed === 0 ? 0.95 : seed === 1 ? 0.78 : 1.2;
}
