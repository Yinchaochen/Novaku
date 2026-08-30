/**
 * What a text-only post's cover says, and how it is set.
 *
 * A post with no picture used to be a tinted square with the first three lines
 * of the body poured into it. Xiaohongshu gives every text post a designed
 * cover instead, and lisum asked for the same, pointing at the craft of
 * Western journaling. This is the decision half of that: a pure function that
 * chooses the sentence, the palette, the type size and the ground, before
 * anything is drawn.
 *
 * Three rules carry the whole thing, and each exists because the obvious
 * alternative fails in a specific way:
 *
 * 1. It is an EXTRACT, not a prefix. Pouring the body in from the top is what
 *    ships today and it reads as truncation, because it is. A whole sentence,
 *    chosen, reads as an epigraph.
 * 2. It never restates the title. The card prints the title 10dp below the
 *    cover, and the seeded posts are the worst offenders: "Getting from BER
 *    into the city" opens with "To get from BER into the city smoothly…".
 *    Printing that above itself is the echo the cover exists to abolish.
 * 3. The size comes from the sentence's length, in bands, snapped to a ladder.
 *    Continuous auto-fitting is exactly what makes generated cards look
 *    auto-fitted; a size that is always one of four values does not.
 *
 * Rendering lives in components/community/PostCover.tsx. This file does no
 * measurement and touches no React, for the same reason lib/cardAspect.ts does
 * not: the card's geometry has to be known before layout, not after it.
 */

export type CoverType = 'guide' | 'question' | 'recommendation' | 'experience' | 'warning';

export interface CoverPalette {
  /** The stock. Deliberately the deepened D-088 tints, not notebook ivory. */
  paper: string;
  /** The ground's dots or rules: 1.2–1.4:1 against the paper, never more. */
  dot: string;
  /** Rubric and metadata. ~5:1. */
  secondary: string;
  /** Body ink. */
  ink: string;
  /** One accent, used once. */
  accent: string;
  /** The highlighter swipe: the accent, already composited over the paper. */
  wash: string;
}

export interface CoverPlan {
  palette: CoverPalette;
  /** The sentence the cover prints. Empty when the post has nothing to lift. */
  keyLine: string;
  /** Type size as a fraction of the canvas width. */
  sizeRatio: number;
  /** Multiplier on the size. Tightens as the size grows, as leading does. */
  leading: number;
  maxLines: number;
  /**
   * Which stationery ground to draw. Stable per post.
   *
   * Dots or nothing. A ruled variant was drawn first and rejected on sight:
   * without measuring the text there is no way to land the rules on the
   * baselines, so they struck through the words instead of sitting under them.
   * A dot field is the ground you can write over precisely because it does not
   * assert a baseline — which is why dotted notebooks exist.
   */
  ground: 'dotted' | 'plain';
  /** A cover with no sentence worth lifting: header and paper, nothing false. */
  isBlank: boolean;
}

/**
 * Ivory would have been the authentic notebook stock, and it is unusable here.
 * The app's page is a cream gradient (#FFFAF2 → #FBEDDF) and the card has no
 * plate of its own since D-088, so a cover in #F7F0DF would sit three RGB
 * units from its own background — invisible, which is the exact failure D-088
 * had just finished fixing. The stocks are therefore the post-type tints, and
 * the journaling research is honoured in everything above them: the ground,
 * the margins, the single accent, the restraint.
 */
const PALETTES: Record<CoverType, CoverPalette> = {
  guide: {
    paper: '#FBE0AE', dot: '#E7C88E', secondary: '#6B5B48',
    ink: '#241A16', accent: '#8A5A08', wash: '#F2CE86',
  },
  question: {
    paper: '#E3DAFF', dot: '#CCC1EE', secondary: '#5B5468',
    ink: '#241A16', accent: '#5546C4', wash: '#CFC2F5',
  },
  recommendation: {
    paper: '#FFD6BC', dot: '#EFBE9E', secondary: '#6C584D',
    ink: '#241A16', accent: '#A83E27', wash: '#F7BE9B',
  },
  experience: {
    paper: '#D7E9CB', dot: '#BCD4AB', secondary: '#54604B',
    ink: '#241A16', accent: '#456B34', wash: '#BFD9AC',
  },
  warning: {
    paper: '#FBD3CE', dot: '#EDB6AF', secondary: '#6B5753',
    ink: '#241A16', accent: '#A8342E', wash: '#F4B7B0',
  },
};

export function coverPalette(postType: string): CoverPalette {
  return PALETTES[(postType as CoverType)] ?? PALETTES.experience;
}

/** Scripts that do not put spaces between words. */
const NO_SPACE_BREAK = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/;

/**
 * Roughly how wide a string is, in ems, without measuring anything.
 *
 * A real measurement pass would mean a layout round-trip inside a recycled
 * list cell. The estimate only has to be good enough to choose between four
 * size rungs, and it is: CJK glyphs are square, Latin averages about half an
 * em, and spaces are narrower still.
 */
export function estimateEm(text: string): number {
  let em = 0;
  for (const ch of text) {
    if (NO_SPACE_BREAK.test(ch)) em += 1;
    else if (ch === ' ') em += 0.26;
    else if (/[ilj.,:;'!|]/.test(ch)) em += 0.28;
    else if (/[A-ZÄÖÜ0-9@#%WM]/.test(ch)) em += 0.62;
    else em += 0.5;
  }
  return em;
}

/** The longest unbreakable run — German compounds decide the size on their own. */
function longestTokenEm(text: string): number {
  if (NO_SPACE_BREAK.test(text)) return 1;
  return text.split(/\s+/).reduce((max, token) => Math.max(max, estimateEm(token)), 0);
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/**
 * How much of the candidate the title already said.
 *
 * Distinct words of four letters or more, over the title's own word count.
 * The first version counted every occurrence of every word over three letters
 * and divided by whichever side was shorter, which meant a short title and a
 * long sentence sharing nothing but three instances of "the" scored 1.0 — and
 * the cover came out blank because its only candidate had been thrown away as
 * an echo. Function words are exactly what two sentences on one subject share
 * without either one repeating the other.
 */
function titleOverlap(candidate: string, title: string): number {
  const titleWords = new Set(normalise(title).split(' ').filter((w) => w.length >= 4));
  if (titleWords.size === 0) return 0;
  const words = new Set(normalise(candidate).split(' ').filter((w) => w.length >= 4));
  if (words.size === 0) return 0;
  let shared = 0;
  words.forEach((w) => {
    if (titleWords.has(w)) shared += 1;
  });
  return shared / titleWords.size;
}

/**
 * Split a paragraph into sentences.
 *
 * The suppressions are not hypothetical. Splitting naively on ". " turned real
 * seeded German into covers reading "103, 13053 Berlin." and "Die
 * Stempelhefte können bis spätestens 22." — an address fragment and a severed
 * date. A full stop is only a sentence end when what follows starts a new one.
 */
export function splitSentences(paragraph: string): string[] {
  const out: string[] = [];
  let start = 0;
  const chars = Array.from(paragraph);
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (!'.!?。！？…'.includes(ch)) continue;
    const before = chars[i - 1] ?? '';
    const rest = chars.slice(i + 1).join('');
    const next = rest.replace(/^\s+/, '').charAt(0);
    const isCjkStop = '。！？'.includes(ch);
    if (!isCjkStop) {
      // "1:1250." / "22." — an ordinal or a figure, not a sentence end. Only
      // when the whole preceding token is numeric, though: the first version
      // tested the single character before the stop, so "…FEX, S9, S45." never
      // ended a sentence, the paragraph after it was swallowed into one long
      // run, and the cover went blank because that run restated the title.
      const priorToken = chars.slice(start, i).join('').split(/[\s(]/).pop() ?? '';
      if (/^\d+(?:[.,:]\d+)*$/.test(priorToken)) continue;
      // "Str. 103" / "Nr. 5" — a number after it belongs to the same phrase.
      if (/\d/.test(next)) continue;
      // A lowercase continuation is an abbreviation, not a new sentence.
      if (next && next === next.toLowerCase() && next !== next.toUpperCase()) continue;
      // Only a space (or the end) closes a sentence in a spaced script.
      if (next && !/\s/.test(rest.charAt(0))) continue;
    }
    const sentence = chars.slice(start, i + 1).join('').trim();
    if (sentence) out.push(sentence);
    start = i + 1;
  }
  const tail = chars.slice(start).join('').trim();
  if (tail) out.push(tail);
  return out;
}

const MIN_EM = 9;
const OVERLAP_LIMIT = 0.6;

/**
 * Whether a paragraph is the credit block rather than prose.
 *
 * The seeders append attribution after a blank line — "Source: …", "Photo: …",
 * "Details & registration: …" — joined by single newlines, so the whole block
 * arrives as one trailing paragraph in which every line is a short label, a
 * colon and a value. Matching that shape rather than the word "Source" is the
 * only reason the rule survives translation into 106 languages.
 */
function isCreditBlock(paragraph: string): boolean {
  const lines = paragraph.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  return lines.every((line) => /^[^:]{1,40}:\s*\S/.test(line));
}

/**
 * The sentence the cover prints, or '' when the post has none worth lifting.
 *
 * Every prose paragraph is in scope, not only the first: the seeded bodies put
 * each sentence in its own paragraph, and the sentence worth lifting is
 * usually not the opening one — the opening one is where the title gets
 * paraphrased.
 */
export function pickKeyLine(body: string, title: string): string {
  const prose = (body ?? '')
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim() && !isCreditBlock(paragraph))
    .join(' ')
    .replace(/\bhttps?:\/\/\S+/gi, '')
    .replace(/\bwww\.\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!prose) return '';

  const candidates = splitSentences(prose);
  let best = '';
  let bestScore = -Infinity;
  // Second choice, taken only when nothing clears the length ceiling. A
  // sentence too long for six lines gets clipped, which is a visible and
  // honest failure; shrinking the type until it fits is neither.
  let overlong = '';
  let overlongScore = -Infinity;

  candidates.forEach((sentence, index) => {
    const em = estimateEm(sentence);
    if (em < MIN_EM) return;
    if (titleOverlap(sentence, title) >= OVERLAP_LIMIT) return;
    const first = Array.from(sentence)[0] ?? '';
    if (/[\d\p{P}]/u.test(first)) return;
    if (first === first.toLowerCase() && first !== first.toUpperCase()) return;

    let score = 0;
    // A sentence carrying a time, a price or a duration is the one worth
    // lifting out of a guide — it is the part a reader acts on.
    if (/\d{1,2}[:.]\d{2}|\d+\s?(EUR|€|min|Uhr|km|%)|\b(19|20)\d{2}\b/i.test(sentence)) score += 2;
    if (em >= 16 && em <= 40) score += 2;
    const digits = (sentence.match(/\d/g) ?? []).length / Math.max(1, sentence.length);
    if (digits > 0.22) score -= 3;
    if (longestTokenEm(sentence) > 11) score -= 4;
    // The opening sentence is the one most likely to paraphrase the title even
    // when it clears the overlap test outright.
    if (index === 0) score -= 2;

    if (em > MAX_EM) {
      if (score > overlongScore) {
        overlongScore = score;
        overlong = sentence;
      }
      return;
    }
    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  });

  return best || overlong;
}

/**
 * Size bands. Four rungs, never anything between them.
 *
 * The floor is 13dp at any canvas width — a floor is a floor, and a cover
 * whose type shrinks to fit is a cover that has stopped being readable in the
 * hand. A sentence too long for the smallest rung is clipped at a word, which
 * is the honest failure.
 */
/**
 * The text block is 12u wide, so a line holds (12/18)/sizeRatio ems. That
 * ratio is independent of the canvas width, which is why a rung's capacity can
 * be a constant even though every device is a different size.
 */
const MEASURE_UNITS = 12 / 18;

/**
 * How much of a line's width word-wrap actually uses.
 *
 * The first version of this file assumed all of it, and the second card in the
 * feed clipped by five characters — a sentence measuring 33em inside a rung
 * whose lines summed to 40em. Wrapping breaks at spaces, so every line gives
 * back up to a word, and across five lines that is a quarter of the block. 78%
 * is measured against the seeded English and German bodies; German packs worse
 * than English and is what sets it.
 */
const PACKING = 0.78;

const RUNGS = [
  { sizeRatio: 0.115, leading: 1.16, maxLines: 3 },
  { sizeRatio: 0.098, leading: 1.24, maxLines: 4 },
  { sizeRatio: 0.082, leading: 1.32, maxLines: 5 },
  // Five, not six. The text block is 10u tall (4u to 14u) = 102.5dp at a
  // 184.5dp canvas, and six lines at this rung need 110dp — the sentence
  // would have run into the bottom margin, which the canon does not allow to
  // be borrowed from.
  { sizeRatio: 0.072, leading: 1.38, maxLines: 5 },
].map((rung) => ({
  ...rung,
  // Derived, not chosen. Hand-picked boundaries were what let the clipping
  // through: they looked reasonable and had no relationship to the geometry
  // they were supposed to describe.
  capacityEm: (MEASURE_UNITS / rung.sizeRatio) * rung.maxLines * PACKING,
}));

/** Past the last rung's capacity a cover clips, which is the honest failure. */
const MAX_EM = RUNGS[RUNGS.length - 1].capacityEm;

export function coverPlan(
  post: { id: string; post_type: string; title: string; body: string },
  displayTitle: string,
  displayBody: string,
): CoverPlan {
  const palette = coverPalette(post.post_type);
  const keyLine = pickKeyLine(displayBody || post.body, displayTitle || post.title);
  const em = keyLine ? estimateEm(keyLine) : 0;
  const rung = RUNGS.find((r) => em <= r.capacityEm) ?? RUNGS[RUNGS.length - 1];

  // A long compound cannot be broken, so it sets the size on its own however
  // short the sentence is. German is the reason this exists.
  const longest = keyLine ? longestTokenEm(keyLine) : 0;
  const sizeRatio = longest > 9 ? Math.min(rung.sizeRatio, 0.072) : rung.sizeRatio;

  // Stable per post: the feed loops (feed_round), and a reader scrolling back
  // must meet the same object rather than a reshuffled one.
  const seed = post.id.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const ground = (['dotted', 'plain'] as const)[seed % 2];

  return {
    palette,
    keyLine,
    sizeRatio,
    leading: rung.leading,
    maxLines: rung.maxLines,
    ground,
    isBlank: keyLine.length === 0,
  };
}
