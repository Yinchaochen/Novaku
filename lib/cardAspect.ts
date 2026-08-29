/**
 * How tall a feed card's picture may be, relative to its width.
 *
 * Cards used to take their height from a hash of the post id and crop the
 * image to fill it. For a photograph that is fine; for an event poster — wide,
 * and mostly words — it cut the text in half, and the only way to find out
 * what the poster said was to open the post.
 *
 * The bounds are now a narrow portrait window rather than the wide band they
 * were, because the width of that band was setting the feed's density. Frames
 * from a recording of the Plaza next to Xiaohongshu (2026-08-29) measured it:
 * every one of their covers renders at 3:4, their cards vary by 7%, and a
 * screen holds ~2.15 of them per column. Ours ranged from a 0.72 portrait
 * (pitch 314dp) to a 1.9 banner (pitch 187dp) — the same feed showing anywhere
 * from 3.7 to 5.9 posts per screen depending on what the ranker handed you.
 * lisum filmed the dense end and called it 很难受.
 *
 * A poster wider than the window is NOT cropped harder to fit it. It keeps its
 * shape and is drawn inside the taller slot with `contain`, which is what
 * Xiaohongshu does with the wide screenshots in their own feed. The card is
 * tall either way; only the picture's own proportions decide whether the room
 * is filled or given back as margin.
 */

/** Tallest a picture may be drawn: 168dp wide -> 210dp tall. */
export const MIN_CARD_ASPECT = 0.8;

/** Shortest: a square. Anything wider is letterboxed rather than cropped. */
export const MAX_CARD_ASPECT = 1.0;

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
 * first render (D-078).
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
  // as a table. They sit close together now — the old 0.78/1.2 spread was a
  // 75dp swing in card height, and a feed whose pitch is unpredictable is the
  // thing that reads as restless. Xiaohongshu's own cards vary by 7%.
  const seed = postId.charCodeAt(0) % 3;
  return seed === 0 ? 0.82 : seed === 1 ? 0.86 : 0.92;
}

/** How a card should draw its picture: the slot to reserve, and how to fill it. */
export interface CardMediaFit {
  /** width / height of the slot reserved before layout. */
  aspect: number;
  /** `contain` letterboxes a picture too wide for the slot instead of cropping it. */
  fit: 'cover' | 'contain';
}

/**
 * The slot a card reserves for its picture, and whether the picture fills it.
 *
 * Splitting these apart is what lets the feed have one rhythm without lying
 * about any individual image. Every card gets a portrait-ish slot, so the
 * pitch is predictable; a picture that does not fit that shape is placed
 * inside it whole rather than trimmed to it.
 */
export function cardMediaFit(
  media: { width?: number | null; height?: number | null } | undefined,
  postId: string,
): CardMediaFit {
  if (!media?.width || !media?.height) {
    return { aspect: cardAspectFor(media, postId), fit: 'cover' };
  }
  const natural = media.width / media.height;
  if (!Number.isFinite(natural) || natural <= 0) {
    return { aspect: cardAspectFor(undefined, postId), fit: 'cover' };
  }
  if (natural > MAX_CARD_ASPECT) {
    // The event-poster case. Keep the tall slot, keep the poster whole.
    return { aspect: MAX_CARD_ASPECT, fit: 'contain' };
  }
  // Taller than the window is cropped, and that is fine: trimming the top and
  // bottom of a tall photograph loses nothing a reader was looking for.
  return { aspect: Math.max(MIN_CARD_ASPECT, natural), fit: 'cover' };
}
