import * as Font from 'expo-font';

import { COVER_FONT_PACKED_COVERAGE } from './coverFontCoverage';

/**
 * The faces a cover pack may set its title in, and the rule for when it may.
 *
 * The nine Latin faces are SIL OFL, bundled through @expo-google-fonts and
 * registered in app/_layout.tsx under the family names below. The six Chinese
 * faces (D-166) are our own subsets of OFL fonts in assets/fonts/cover, built
 * by scripts/build-cover-cjk-fonts.py and loaded the first time a cover needs
 * one (`asset`), so nobody downloads 11.7 MB of brush script at start-up. The
 * Latin faces have no CJK glyph, most lack Cyrillic and Greek, and three (Rock Salt, Permanent Marker,
 * Covered By Your Grace) lack the Polish, Czech and Hungarian letters — which
 * is why the choice is made per title, against the face's own cmap, and never
 * per language label. D-148's rule, unchanged: a string with one glyph outside
 * the face keeps the system stack, whole. A Chinese title takes the pack's
 * Chinese faces (`cjkFonts`), a Latin title its Latin ones, never each other's;
 * a Japanese or Korean title, or a Chinese one with a rare character, keeps the
 * system face, and the pack's paper, ink and stickers still say which pack it is.
 *
 * `scale` corrects for how large each face sets at a given size, measured in
 * the prototype against the system face; `track` is letter-spacing in ems and
 * `upper` means the face wants capitals (the marker faces are drawn that way).
 */
export type CoverFace =
  | 'caveat'
  | 'patrick'
  | 'kalam'
  | 'marker'
  | 'rocksalt'
  | 'grace'
  | 'amatic'
  | 'playfair'
  | 'lobster'
  // Chinese (D-166): GB2312 level 1 + punctuation + Latin.
  | 'kuaile'
  | 'mashan'
  | 'longcang'
  | 'zhimang'
  | 'serifsc'
  | 'smiley';

export interface CoverFaceSpec {
  family: string;
  weight: '400' | '700' | '800' | '900';
  scale: number;
  track?: number;
  upper?: boolean;
  /** Line height as a multiple of the size, where the face's ascenders need more than the default. */
  lead?: number;
  /** Bundled but registered on first use rather than at start-up. */
  asset?: number;
}

export const COVER_FACES: Record<CoverFace, CoverFaceSpec> = {
  caveat: { family: 'Caveat_700Bold', weight: '700', scale: 1.16, track: 0.01 },
  patrick: { family: 'PatrickHand_400Regular', weight: '400', scale: 1.1, track: 0.02 },
  kalam: { family: 'Kalam_700Bold', weight: '700', scale: 1.02, track: 0.01, lead: 1.3 },
  marker: { family: 'PermanentMarker_400Regular', weight: '400', scale: 0.98, track: 0.01, upper: true, lead: 1.3 },
  // Rock Salt's capitals reach well above the em box; set tight they collide.
  rocksalt: { family: 'RockSalt_400Regular', weight: '400', scale: 0.8, track: 0.01, upper: true, lead: 1.55 },
  grace: { family: 'CoveredByYourGrace_400Regular', weight: '400', scale: 1.12, track: 0.01 },
  amatic: { family: 'AmaticSC_700Bold', weight: '700', scale: 1.28, track: 0.03 },
  playfair: { family: 'PlayfairDisplay_800ExtraBold', weight: '800', scale: 1 },
  lobster: { family: 'Lobster_400Regular', weight: '400', scale: 1.02 },
  // Scale and tracking as the prototype measured them against the system face.
  kuaile: { family: 'ZCOOLKuaiLe_Cover', weight: '400', scale: 1.04, asset: require('../assets/fonts/cover/ZCOOLKuaiLe_Cover.ttf') },
  mashan: { family: 'MaShanZheng_Cover', weight: '400', scale: 1.1, track: 0.02, asset: require('../assets/fonts/cover/MaShanZheng_Cover.ttf') },
  longcang: { family: 'LongCang_Cover', weight: '400', scale: 1.14, track: 0.03, asset: require('../assets/fonts/cover/LongCang_Cover.ttf') },
  zhimang: { family: 'ZhiMangXing_Cover', weight: '400', scale: 1.12, track: 0.03, asset: require('../assets/fonts/cover/ZhiMangXing_Cover.ttf') },
  serifsc: { family: 'NotoSerifSC900_Cover', weight: '900', scale: 1, asset: require('../assets/fonts/cover/NotoSerifSC900_Cover.ttf') },
  smiley: { family: 'SmileySans_Cover', weight: '400', scale: 1.04, asset: require('../assets/fonts/cover/SmileySans_Cover.ttf') },
};

/** Is this face ready to set text in right now? The start-up faces always are. */
export function coverFaceLoaded(face: CoverFace | null): boolean {
  if (!face) return true;
  const spec = COVER_FACES[face];
  return !spec.asset || Font.isLoaded(spec.family);
}

const pending = new Map<string, Promise<void>>();

/** Register an on-demand face once; every cover that asks shares the one load. */
export function loadCoverFace(face: CoverFace): Promise<void> {
  const spec = COVER_FACES[face];
  if (!spec.asset || Font.isLoaded(spec.family)) return Promise.resolve();
  let load = pending.get(spec.family);
  if (!load) {
    load = Font.loadAsync({ [spec.family]: spec.asset }).catch((error) => {
      pending.delete(spec.family);
      throw error;
    });
    pending.set(spec.family, load);
  }
  return load;
}

const coverage = new Map<string, Set<number>>();

function coverageOf(family: string): Set<number> {
  const cached = coverage.get(family);
  if (cached) return cached;
  const built = new Set<number>();
  let codepoint = 0;
  for (const delta of (COVER_FONT_PACKED_COVERAGE[family] ?? '').split('.')) {
    if (!delta) continue;
    codepoint += parseInt(delta, 36);
    built.add(codepoint);
  }
  coverage.set(family, built);
  return built;
}

/** Can this face draw every glyph of the text? Whitespace is exempt. */
export function faceCovers(face: CoverFace, text: string): boolean {
  if (!text) return false;
  const set = coverageOf(COVER_FACES[face].family);
  for (const character of text) {
    if (/\s/.test(character)) continue;
    const code = character.codePointAt(0);
    if (code === undefined || !set.has(code)) return false;
  }
  return true;
}

/**
 * The face a card sets its text in: rotate through the pack's list from the
 * card's own slot and take the first that covers the text. Null when none
 * does, which is the system stack.
 */
export function pickFace(faces: readonly CoverFace[] | undefined, seed: number, text: string): CoverFace | null {
  if (!faces || faces.length === 0) return null;
  const n = faces.length;
  const start = ((seed % n) + n) % n;
  for (let i = 0; i < n; i += 1) {
    const face = faces[(start + i) % n];
    if (faceCovers(face, text)) return face;
  }
  return null;
}

/** The text as the face wants it set. */
export function faceText(face: CoverFace | null, text: string): string {
  return face && COVER_FACES[face].upper ? text.toUpperCase() : text;
}
