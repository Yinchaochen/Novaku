import { DISPLAY_FONT_PACKED_COVERAGE } from './displayFontCoverage';

/**
 * When the cover may set its own face, and when it must not (D-148).
 *
 * PostCover has carried a prohibition since it was written — nothing in it may
 * set a fontFamily — and the reason was measured rather than assumed: Plus
 * Jakarta Sans carries 721 codepoints, so attaching it would have replaced the
 * text of roughly 38 of the app's 106 locales with tofu boxes, silently,
 * because a missing glyph raises nothing.
 *
 * The prohibition is now conditional instead of absolute. The app bundles a
 * subset of Source Han Sans Bold (SIL OFL) built by
 * scripts/build-display-font.py, and this file knows exactly which codepoints
 * went into it. A string made entirely of those gets the display face; a
 * string with one character outside them keeps the system stack, whole — never
 * a mixture, because a mixture is how you get a headline where three glyphs
 * are a different typeface and nobody can say why.
 *
 * The check is per string, at render time, and cheap: one Set lookup per
 * character over a title of at most a few dozen.
 */

let coverage: Set<number> | null = null;

function ensureCoverage(): Set<number> {
  if (coverage) return coverage;
  const built = new Set<number>();
  let codepoint = 0;
  for (const delta of DISPLAY_FONT_PACKED_COVERAGE.split('.')) {
    codepoint += parseInt(delta, 36);
    built.add(codepoint);
  }
  coverage = built;
  return built;
}

/** The family name registered in app/_layout.tsx. */
export const DISPLAY_FONT_FAMILY = 'PosterviaDisplay-Bold';

/**
 * Can the bundled face draw this string in full?
 *
 * Whitespace is exempt — a newline has no glyph and never had one. Everything
 * else has to be in the subset, including the punctuation, because a title
 * ending in a Cyrillic quotation mark is still a title with a tofu box in it.
 */
export function canUseDisplayFont(text: string): boolean {
  if (!text) return false;
  const set = ensureCoverage();
  for (const character of text) {
    const code = character.codePointAt(0);
    if (code === undefined) return false;
    // \s covers the space, tab, newline and the ideographic space.
    if (/\s/.test(character)) continue;
    if (!set.has(code)) return false;
  }
  return true;
}

/** `fontFamily` for a string, or undefined to leave the system stack alone. */
export function displayFontFor(text: string): string | undefined {
  return canUseDisplayFont(text) ? DISPLAY_FONT_FAMILY : undefined;
}
