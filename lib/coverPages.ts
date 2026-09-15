import {
  COVER_TEMPLATES,
  estimateEm,
  isCoverTemplateId,
  isCreditBlock,
  MEASURE_UNITS,
  PACKING,
  splitSentences,
} from './postCover';

/**
 * A text post poured across several drawn pages (D-142).
 *
 * Xiaohongshu's composer turns an article into a stack of designed cards --
 * "共2张" with a slider under it -- and that stack is the note. It is the half
 * of their typesetting that actually makes a text post interesting rather than
 * merely presentable: one cover says "this exists", a stack says "there is
 * something in here".
 *
 * Three rules decide everything below, and each is forced rather than chosen:
 *
 * 1. PAGES ARE COMPUTED WHEN THE POST IS READ, never stored. The body is
 *    translated per reader, and a German paragraph is not a Chinese paragraph:
 *    a page count baked at publish time would be wrong for every reader who is
 *    not the author. This is the same constraint that keeps the cover from
 *    being rendered to an image (D-135), and it has the same answer.
 * 2. A PAGE NEVER BREAKS MID-SENTENCE. Paragraphs are the preferred seam and
 *    sentences are the fallback; a card that ends halfway through a clause
 *    reads as a bug even when the next card continues it.
 * 3. THE PAGES ARE NEVER THE ONLY COPY. The detail keeps the body as ordinary
 *    selectable, linkified, translatable text underneath. So a body that does
 *    not fit MAX_PAGES simply stops being paged -- nothing is lost, and the
 *    cap can therefore be a reading decision rather than a data one.
 */

/** How tall a body page's type is, as a fraction of the card's width. */
const BODY_SIZE_RATIO = 0.052;

/** Leading, as a multiple of the size. Looser than the cover: this is reading. */
export const BODY_LEADING = 1.5;

/** Lines a body page holds, between its top and bottom margins. */
const BODY_LINES = 9;

/**
 * The whole stack, cover included.
 *
 * Nine rather than their eighteen. A stack is an invitation to swipe, and past
 * about eight swipes the invitation becomes a chore -- at which point the text
 * underneath is simply the better surface, and it is already there.
 */
export const MAX_PAGES = 9;

/**
 * How many ems one LINE of a body page holds.
 *
 * Capacity is counted in lines rather than in ems, and that is a correction
 * rather than a preference. Counting ems and dividing at the end assumes every
 * paragraph ends exactly at a line break and that two paragraphs cost nothing
 * to separate. Neither is true: a paragraph's last line is usually part empty,
 * and the gap between paragraphs is real vertical space. The dev gallery
 * showed the result immediately -- the final page of a five-page guide ran off
 * the bottom of its card, by about the amount those two errors add up to.
 */
export function bodyLineEm(scale = 1): number {
  // Note what is NOT here: PACKING. That constant exists to model the slack a
  // wrap leaves on the last line of a block, and rounding each paragraph up to a
  // whole line models the same slack a second time. Applying both made every
  // page about a third empty and turned a five-page guide into seven -- which
  // the gallery showed just as plainly as it had shown the overflow.
  return MEASURE_UNITS / (BODY_SIZE_RATIO * scale);
}

/** The gap between two paragraphs, as a fraction of a line. */
const PARAGRAPH_GAP_LINES = 0.55;

/** How many lines a piece of prose takes, its part-empty last line included. */
export function linesFor(text: string, scale = 1): number {
  return Math.ceil(estimateEm(text) / bodyLineEm(scale));
}

/** How many ems of text one body page holds, if nothing were left part-empty. */
export function bodyPageCapacityEm(scale = 1): number {
  return bodyLineEm(scale) * BODY_LINES;
}

export interface CoverBodyPage {
  /** The paragraphs on this page, in order, already trimmed. */
  paragraphs: string[];
}

/** The type size a body page sets at, as a fraction of the card's width. */
export function bodyPageSizeRatio(template?: string | null): number {
  const scale = isCoverTemplateId(template) ? COVER_TEMPLATES[template].scale : 1;
  return BODY_SIZE_RATIO * scale;
}

/**
 * Pour a body across pages.
 *
 * Greedy and deliberately so. A balanced fill -- every page equally full --
 * looks better as a diagram and worse as a book: the reader meets the pages
 * one at a time and in order, so what matters is that each one is full enough
 * to be worth a swipe, not that the last one is as full as the first.
 */
export function paginateBody(body: string, template?: string | null): CoverBodyPage[] {
  const scale = isCoverTemplateId(template) ? COVER_TEMPLATES[template].scale : 1;
  const lineEm = bodyLineEm(scale);
  const paragraphs = (body || '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    // The seeded posts end in a credit block -- "Source: kulturdaten.berlin",
    // "Photo: ..." -- which is attribution, not prose, and a card of it is a
    // card of nothing. It stays in the body text below, where the attribution
    // has to be and where it still is.
    .filter((paragraph) => !isCreditBlock(paragraph));

  const pages: CoverBodyPage[] = [];
  let current: string[] = [];
  let used = 0;

  const flush = () => {
    if (current.length > 0) {
      pages.push({ paragraphs: current });
      current = [];
      used = 0;
    }
  };

  const place = (piece: string) => {
    const cost = linesFor(piece, scale) + (current.length > 0 ? PARAGRAPH_GAP_LINES : 0);
    if (current.length > 0 && used + cost > BODY_LINES) flush();
    current.push(piece);
    used += current.length > 1 ? cost : linesFor(piece, scale);
  };

  for (const paragraph of paragraphs) {
    if (pages.length >= MAX_PAGES - 1) break;
    if (linesFor(paragraph, scale) <= BODY_LINES) {
      place(paragraph);
      continue;
    }
    // Too long for any page on its own: fall back to its sentences, and
    // rejoin the ones that land on the same page so they read as prose rather
    // than as a list.
    let run: string[] = [];
    let runEm = 0;
    const flushRun = () => {
      if (run.length > 0) {
        place(run.join(' '));
        run = [];
        runEm = 0;
      }
    };
    for (const sentence of splitSentences(paragraph)) {
      const em = estimateEm(sentence);
      // A run is one paragraph's worth of prose, so it is measured in ems and
      // only rounded to lines when it is placed -- sentences inside a run wrap
      // into each other and do not each start a line of their own.
      if (runEm > 0 && Math.ceil((runEm + em) / lineEm) > BODY_LINES) flushRun();
      run.push(sentence);
      runEm += em;
    }
    flushRun();
  }
  flush();

  return pages.slice(0, MAX_PAGES - 1);
}
