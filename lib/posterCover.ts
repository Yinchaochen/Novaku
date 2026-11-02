import { COVER_FACES, faceText, pickFace, type CoverFace } from './coverFonts';
import { resolveMediaUrl } from './media';
import { wrappedLines } from './postCover';

/**
 * The poster cover: a photo, a big word and a cut-out subject standing in front
 * of the word (plan/plaza-cover-asset-library.md §12).
 *
 * A poster baked into one image freezes its word in one language, which D-135,
 * D-141 and D-142 rule out for anything on Plaza. So the picture is kept in two
 * files and the words are set between them, for each reader, the way a text
 * cover is. This file decides how those words are set; components/community/
 * PosterCover.tsx draws them.
 */

/** Fractions of the poster's width and height. */
export interface PosterBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The layers of `community_posts.cover_spec.poster`, keyed as the poster script writes them.
 * The phrase is stored beside these and reaches the cover already translated.
 */
export interface PosterSpec {
  /** Paper and photo. A number is a bundled asset, which only the dev gallery has. */
  base: string | number;
  /** The cut-out subject, the same size as the base and transparent around it. */
  subject: string | number;
  paper: string;
  ink: string;
  /** Darker than `ink`: the title has to pass the same 7:1 as every cover's text. */
  title_ink: string;
  word_box: PosterBox;
  title_box: PosterBox;
  /** How much of the picture the subject covers: a string per row, a digit 0–9 per column. */
  subject_grid: string[];
}

/** `community_posts.cover_spec` as the API sends it. */
export interface CoverSpecWire {
  v: number;
  poster?: (PosterSpec & { word: string }) | null;
}

export const POSTER_ASPECT = 3 / 4;

/**
 * A post's poster with its word in the reader's language, or null for the text
 * cover. Checked because the spec is a JSON column: a version this build has not
 * heard of, or a damaged row, costs the card its poster and nothing else.
 */
export function posterOf(post: {
  cover_spec?: CoverSpecWire | null;
  translated_cover_word?: string | null;
}): { spec: PosterSpec; word: string } | null {
  const poster = post.cover_spec?.poster;
  if (post.cover_spec?.v !== 1 || !poster) return null;
  const layer = (value: string | number) => (typeof value === 'string' ? resolveMediaUrl(value) : value);
  const base = layer(poster.base);
  const subject = layer(poster.subject);
  const word = post.translated_cover_word || poster.word;
  if (!base || !subject || !word) return null;
  if (!poster.word_box || !poster.title_box || !Array.isArray(poster.subject_grid)) return null;
  return { spec: { ...poster, base, subject }, word };
}

/** Right to left: Hebrew, Arabic, Syriac and their presentation forms. */
const RTL_RE = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
/** Marks stack above and below the line: the same RTL block, Indic through Mongolian. */
const TALL_RE = /[֐-ࣿऀ-᢯יִ-﷿ﹰ-﻿]/;
const SQUARE_RE = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/;

export type PosterScript = 'square' | 'tall' | 'plain';

export function posterScript(text: string): PosterScript {
  if (TALL_RE.test(text)) return 'tall';
  return SQUARE_RE.test(text) ? 'square' : 'plain';
}

/**
 * In ems of the size a line is set at. `ink` is the most the glyphs can reach,
 * `body` where most of them stand, `drop` how far below the middle of the line
 * box they sit, `pitch` how far apart two lines go, `box` a line box roomy enough
 * that a single-line Text cannot clip them: Abril capitals stand 0.7 but reach
 * 0.93 with an umlaut, and a Thai tone mark over a vowel sits well above the
 * Latin ascender.
 */
const WORD_METRICS: Record<PosterScript, { ink: number; body: number; drop: number; pitch: number; box: number }> = {
  square: { ink: 1, body: 0.92, drop: 0.055, pitch: 1.08, box: 1.4 },
  plain: { ink: 0.95, body: 0.72, drop: 0.03, pitch: 1, box: 1.4 },
  tall: { ink: 1.35, body: 1, drop: 0, pitch: 1.4, box: 2 },
};

/** The word stops short of the box: browsers and Android round a line's width differently. */
const WORD_SLACK = 0.97;

/** Set a word this much smaller if that is what keeps it readable behind the subject. */
const WORD_SCALES = [1, 0.85, 0.7, 0.55];

/** Marks and spaces, which take no letter of their own. */
const NOT_A_LETTER = /[\s̀-ًͯ-ٰٟऀ-ःऺ-ॏัิ-ฺ็-๎]/g;


// Abril is the poster's own face; Noto Serif Black is what the Chinese samples were set in.
const WORD_FACES: readonly CoverFace[] = ['abril', 'serifsc'];
const TITLE_FACES: readonly CoverFace[] = ['kalam', 'kuaile'];

/** The size title.py wrote the samples at, and the smallest a card lets a title go. */
const TITLE_MAX = 0.082;
const TITLE_MIN = 0.052;

export interface PosterPlan {
  /** The phrase as drawn. */
  word: string;
  wordFace: CoverFace | null;
  wordScript: PosterScript;
  /** Each way to set the phrase: whole, or broken in two at a space. */
  layouts: string[][];
  title: string;
  titleFace: CoverFace | null;
  titleLead: number;
  titleTrack: number;
  rtl: boolean;
}

export function posterPlan(word: string, title: string): PosterPlan {
  // Machine translation closes even a two-word phrase with a full stop.
  const phrase = word.trim().replace(/[.。]+$/, '');
  // A face is chosen for the string it will draw, and a Latin face draws capitals.
  const wordFace = pickFace(WORD_FACES, 0, phrase.toUpperCase());
  const drawn = faceText(wordFace, phrase);
  const parts = drawn.split(/\s+/).filter(Boolean);
  const layouts: string[][] = parts.length > 0 ? [[parts.join(' ')]] : [];
  for (let i = 1; i < parts.length; i += 1) {
    layouts.push([parts.slice(0, i).join(' '), parts.slice(i).join(' ')]);
  }
  const text = title.trim();
  const titleFace = pickFace(TITLE_FACES, 0, text);
  const spec = titleFace ? COVER_FACES[titleFace] : null;
  return {
    word: drawn,
    wordFace,
    wordScript: posterScript(drawn),
    layouts,
    title: text,
    titleFace,
    titleLead: spec?.lead ?? (posterScript(text) === 'tall' ? 1.5 : 1.25),
    titleTrack: spec?.track ?? 0,
    rtl: RTL_RE.test(text),
  };
}

/** Every line that any layout would draw, once each. */
export function posterLines(plan: PosterPlan): string[] {
  return Array.from(new Set(plan.layouts.flat()));
}

/** The share of a rectangle the subject covers. All four edges are fractions of the poster. */
function coveredShare(grid: string[], left: number, top: number, right: number, bottom: number): number {
  if (grid.length === 0) return 0;
  const rows = grid.length;
  const columns = grid[0].length;
  const firstRow = Math.max(0, Math.floor(top * rows));
  const lastRow = Math.min(rows - 1, Math.ceil(bottom * rows) - 1);
  const firstColumn = Math.max(0, Math.floor(left * columns));
  const lastColumn = Math.min(columns - 1, Math.ceil(right * columns) - 1);
  let sum = 0;
  let cells = 0;
  for (let row = firstRow; row <= lastRow; row += 1) {
    for (let column = firstColumn; column <= lastColumn; column += 1) {
      sum += grid[row].charCodeAt(column) - 48;
      cells += 1;
    }
  }
  return cells === 0 ? 0 : sum / (cells * 9);
}

/**
 * How much the subject hides of a letter-wide stretch of the line, one share per
 * stretch. Square glyphs fall where the arithmetic says. Nothing here knows
 * where a Latin, Arabic or Thai letter falls, so those stretches overlap: a
 * tower standing between two assumed letters otherwise counts as half of each,
 * and took the whole ร of อย่ารอ while scoring 50%.
 * `centreX`, `centreY`, `lineWidth` and `lineHeight` are fractions of the poster.
 */
export function hiddenLetters(
  grid: string[],
  line: string,
  square: boolean,
  centreX: number,
  centreY: number,
  lineWidth: number,
  lineHeight: number,
): number[] {
  const letters = Math.max(1, Array.from(line.replace(NOT_A_LETTER, '')).length);
  const letter = lineWidth / letters;
  const step = square ? letter : letter / 2;
  const left = centreX - lineWidth / 2;
  const shares: number[] = [];
  for (let start = 0; start + letter <= lineWidth + 1e-6; start += step) {
    shares.push(coveredShare(grid, left + start, centreY - lineHeight / 2, left + start + letter, centreY + lineHeight / 2));
  }
  return shares;
}

export interface PosterWordFit {
  lines: string[];
  size: number;
  /** Where the middle of each line goes, in px down the card. */
  centres: number[];
  /** The line box each is set in, and how far to lift it to centre the glyphs, in px. */
  lineBox: number;
  drop: number;
}

/**
 * Where the phrase goes for this reader. The size changes and the word moves,
 * and nothing else: the samples stretched each word to fill a 3:1 box, which
 * only three Han glyphs survive.
 *
 * The script searched for a place that let the subject cross the source word,
 * so a translation of any other length lands somewhere nobody looked: LANGSAM
 * lost its G to a lantern and KEINE PANIK its second line to a post box. This
 * is that search again per reader, and it wants three things in order: the
 * subject really crosses the word, no letter loses more than half of itself,
 * and the word stays as big and as high as those two allow, high being where
 * the samples put it.
 *
 * `emOf` is the line's measured width in ems. Nothing here estimates it: Arabic
 * joins and Thai stacks, so a per-letter table is wrong by more than the slack,
 * and at this size being wrong is a word off the card.
 */
export function fitPosterWord(
  layouts: string[][],
  script: PosterScript,
  emOf: (line: string) => number,
  spec: Pick<PosterSpec, 'word_box' | 'subject_grid'>,
  width: number,
): PosterWordFit | null {
  if (layouts.length === 0) return null;
  const height = width / POSTER_ASPECT;
  const { word_box: box, subject_grid: grid } = spec;
  const metrics = WORD_METRICS[script];
  const largest = layouts.map((lines) =>
    Math.min(
      (box.w * width * WORD_SLACK) / Math.max(...lines.map(emOf)),
      (box.h * height) / (metrics.ink + (lines.length - 1) * metrics.pitch),
    ),
  );
  const biggest = Math.max(...largest);
  const step = height / 40;
  let best: PosterWordFit | null = null;
  let bestScore = -Infinity;
  layouts.forEach((lines, layout) => {
    for (const scale of WORD_SCALES) {
      const size = largest[layout] * scale;
      const reach = (metrics.ink + (lines.length - 1) * metrics.pitch) * size;
      const bottom = (box.y + box.h) * height - reach / 2;
      // A word that exactly fills the box has one place to go, and rounding must not lose it.
      for (let middle = box.y * height + reach / 2; middle <= bottom + 0.001; middle += step) {
        const centres = lines.map((_, n) => middle + (n - (lines.length - 1) / 2) * metrics.pitch * size);
        const hidden = lines.flatMap((line, n) =>
          hiddenLetters(
            grid,
            line,
            script === 'square',
            box.x + box.w / 2,
            centres[n] / height,
            (emOf(line) * size) / width,
            (metrics.body * size) / height,
          ),
        );
        const worst = Math.max(...hidden);
        const mean = hidden.reduce((sum, share) => sum + share, 0) / hidden.length;
        const score =
          Math.min(worst, 0.15) * 6 -
          Math.max(0, worst - 0.5) * 6 -
          Math.max(0, mean - 0.3) * 3 +
          size / biggest -
          (middle / height - box.y) * 0.3;
        if (score > bestScore) {
          bestScore = score;
          best = { lines, size, centres, lineBox: size * metrics.box, drop: size * metrics.drop };
        }
      }
    }
  });
  return best;
}

export interface PosterTitleFit {
  size: number;
  /** Past this the title ends in an ellipsis rather than running into the word. */
  maxLines: number;
}

export function fitPosterTitle(
  plan: PosterPlan,
  family: string | null,
  cardWidth: number,
  boxWidth: number,
  boxHeight: number,
): PosterTitleFit {
  const floor = cardWidth * TITLE_MIN;
  let size = cardWidth * TITLE_MAX;
  while (
    size > floor &&
    wrappedLines(plan.title, family, size, boxWidth, plan.titleTrack) * size * plan.titleLead > boxHeight
  ) {
    size *= 0.94;
  }
  size = Math.max(size, floor);
  return { size, maxLines: Math.max(1, Math.floor(boxHeight / (size * plan.titleLead))) };
}
