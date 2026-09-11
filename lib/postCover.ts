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

/**
 * The phrase the highlighter goes under, and the text either side of it.
 *
 * Three parts rather than an index pair because the renderer nests them as
 * three `<Text>` runs: RN paints a nested run's `backgroundColor` behind its
 * glyphs and re-flows it with the wrap, so the swipe follows a phrase across a
 * line break for free. Drawing a rect instead would need the measurement pass
 * this file exists to avoid.
 */
export interface CoverHighlight {
  before: string;
  span: string;
  /** Whatever trails the phrase — in practice the full stop, left unpainted. */
  after: string;
}

export interface CoverPlan {
  palette: CoverPalette;
  /** The sentence the cover prints. Empty when the post has nothing to lift. */
  keyLine: string;
  /** The phrase to wash, or null when the line is too short to have a shape. */
  highlight: CoverHighlight | null;
  /** One emoji, set as a stamp in the margin. Null when nothing fits the post. */
  sticker: string | null;
  /**
   * The thematic mark set enormous and faint behind the text, bleeding off the
   * top right corner.
   *
   * Half the covers drew `ground: 'plain'` and were exactly that — a flat
   * panel of colour. lisum put a Xiaohongshu card beside one: theirs is never
   * a plain field, it carries a big soft grey mark, and that mark is about
   * what the post says. Slug-derived, so it stays on theme in all 106
   * locales, which a mark chosen from the words could not. See `coverMark`
   * for why it is a glyph and not the sticker enlarged.
   */
  watermark: string | null;
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
 * Ten stocks, two per post type, and every one of them cool.
 *
 * That is not a taste: it is the only band the page leaves open. The app's
 * page is a cream gradient (#FFFAF2 → #FBEDDF) with no plate under the card
 * since D-088, and measuring candidates in CIELAB against both ends of it
 * gives a rule with no exceptions — a WARM stock can be light or it can be
 * low-chroma, never both. Xiaohongshu's own creams measure ΔE 3.3–4.6 here
 * and are simply invisible; they work there because their page is white.
 * Four separate attempts at warm paper ran into this, and the last one, which
 * solved for minimum chroma at every hue, collapsed all ten to the same grey.
 *
 * So the ground goes cool and the accent carries the warmth. That inversion
 * is also what fixes the thing lisum actually pointed at: the old stocks put a
 * butter wash on butter paper, a peach wash on peach paper — one hue per card,
 * which is why they read flat next to a Xiaohongshu cover whose cream ground
 * carries a BLUE highlight. Every pair below is at least 45° of hue apart, and
 * most are near-complementary.
 *
 * Held, and checked by the tests: ΔE ≥ 12.5 from both ends of the page, ink at
 * ≥ 7:1 on the wash, wash ≥ 12 ΔE from its own paper. Mean chroma is 8.3
 * against the old 20.2 — paper rather than candy, which was the other half of
 * the note.
 */
const STOCKS: Record<CoverType, [CoverPalette, CoverPalette]> = {
  guide: [
    { paper: '#DCE4EF', dot: '#CAD2DD', secondary: '#5B5F64',
      ink: '#241A16', accent: '#87621A', wash: '#F7CF93' },
    { paper: '#D9E7CE', dot: '#C8D5BD', secondary: '#5A6054',
      ink: '#241A16', accent: '#8E5C4A', wash: '#F3C3B2' },
  ],
  question: [
    { paper: '#E0DAF2', dot: '#CFC9E1', secondary: '#5C5964',
      ink: '#241A16', accent: '#7D6708', wash: '#F8DC93' },
    { paper: '#CBE0DD', dot: '#BACFCC', secondary: '#525C5B',
      ink: '#241A16', accent: '#886032', wash: '#F2C9A0' },
  ],
  recommendation: [
    { paper: '#E9DCEC', dot: '#D8CBDB', secondary: '#615B62',
      ink: '#241A16', accent: '#886032', wash: '#F2C9A0' },
    { paper: '#D8DEF0', dot: '#C7CDDF', secondary: '#595B64',
      ink: '#241A16', accent: '#8B5F3D', wash: '#F3C7A8' },
  ],
  experience: [
    { paper: '#CDDCE6', dot: '#BCCBD5', secondary: '#525A5E',
      ink: '#241A16', accent: '#7B6720', wash: '#EFD79A' },
    { paper: '#D2E0C6', dot: '#C1CFB6', secondary: '#565C50',
      ink: '#241A16', accent: '#8B5C63', wash: '#EEC2C8' },
  ],
  warning: [
    { paper: '#E7E2F0', dot: '#D5D1DE', secondary: '#615E65',
      ink: '#241A16', accent: '#8B5F3D', wash: '#F3C7A8' },
    { paper: '#D5DFEA', dot: '#C4CED9', secondary: '#575C61',
      ink: '#241A16', accent: '#87621A', wash: '#F7CF93' },
  ],
};

export function coverPalette(postType: string, variant = 0): CoverPalette {
  const pair = STOCKS[(postType as CoverType)] ?? STOCKS.experience;
  return pair[variant % pair.length];
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
 * Bigram overlap runs lower than word overlap for the same amount of
 * repetition: two Chinese sentences on one subject share a couple of
 * two-character compounds where two English ones would share whole words. The
 * divisor puts both measures on one scale so a single threshold governs both.
 *
 * 0.8 is set by the real case rather than picked. 「从机场进城」against
 * 「进城最快的是机场快线」shares 机场 and 进城 — two of the title's four
 * bigrams, a raw 0.50 — and that pair has to land above the 0.6 limit, because
 * it is the same sentence twice.
 */
const CJK_OVERLAP_SCALE = 0.8;

/** Overlapping character pairs — the unit of comparison when there are no words. */
function bigrams(text: string): Set<string> {
  const chars = Array.from(normalise(text).replace(/\s+/g, ''));
  const out = new Set<string>();
  for (let i = 0; i < chars.length - 1; i += 1) out.add(chars[i] + chars[i + 1]);
  return out;
}

function shareOf(candidate: Set<string>, reference: Set<string>): number {
  if (reference.size === 0 || candidate.size === 0) return 0;
  let shared = 0;
  candidate.forEach((item) => {
    if (reference.has(item)) shared += 1;
  });
  return shared / reference.size;
}

/**
 * How much of the candidate the title already said.
 *
 * Two measures, because the two scripts we serve most do not share a notion of
 * a word.
 *
 * For spaced scripts: distinct words of four letters or more, over the title's
 * own word count. An earlier version counted every occurrence of every word
 * over three letters and divided by whichever side was shorter, so a short
 * title and a long sentence sharing nothing but three instances of "the"
 * scored a perfect 1.0 — and the cover rendered blank, its only candidate
 * discarded as an echo. Function words are exactly what two sentences on one
 * subject share without either repeating the other.
 *
 * For Chinese, Japanese and Korean: character bigrams. Splitting on whitespace
 * turns a Chinese title into one long token that matches nothing, so the echo
 * test simply never fired — the same blind spot the backend's topic spacing
 * has (D-086). Bigrams need no dictionary and no segmenter: 「从机场进城」and
 * 「进城最快的是机场快线」share 机场 and 进城, which is what makes them the same
 * sentence twice. The threshold is higher than the word one because adjacent
 * characters recur far more readily than whole words do.
 */
function titleOverlap(candidate: string, title: string): number {
  if (NO_SPACE_BREAK.test(title) || NO_SPACE_BREAK.test(candidate)) {
    return shareOf(bigrams(candidate), bigrams(title)) / CJK_OVERLAP_SCALE;
  }
  const titleWords = new Set(normalise(title).split(' ').filter((w) => w.length >= 4));
  const words = new Set(normalise(candidate).split(' ').filter((w) => w.length >= 4));
  return shareOf(words, titleWords);
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
    // A sentence whose longest word cannot fit even the smallest rung's line
    // will be broken mid-word by every renderer we target, so prefer any
    // rival. The bound is the rung's own line, not a number that looks about
    // right: 11 left a gap from 9.26 to 11 in which the penalty never fired,
    // and "Berufsqualifikationen" measures 9.74 — the screenshot that started
    // this investigation was sitting inside the gap, not outside the rule.
    if (longestTokenEm(sentence) > MAX_TOKEN_EM) score -= 4;
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
  // What one line of this rung holds. A token wider than this cannot wrap and
  // gets broken mid-word by every renderer we target.
  lineEm: MEASURE_UNITS / rung.sizeRatio,
}));

/** Past the last rung's capacity a cover clips, which is the honest failure. */
const MAX_EM = RUNGS[RUNGS.length - 1].capacityEm;

/**
 * Past this a word cannot wrap at any rung, so no size choice can save it and
 * the renderer will break it mid-word with no hyphen.
 *
 * That break is where this stops. Hyphenating it properly needs a dictionary:
 * iOS exposes no hyphenation control on Text at all, Android's uses the
 * *device* locale rather than the text's — a German post on a Turkish phone
 * would get Turkish patterns — and react-native-web drops the prop silently,
 * so the fix would be invisible in the gallery the project reviews UI in.
 * Injecting soft hyphens by hand is worse still: a hyphen is an assertion
 * about where a word divides, and in German a wrong one changes what the word
 * appears to say, to readers whose German is weak and who are trying to look
 * the word up. A break with no hyphen reads as the layout engine losing, which
 * is true. The ordering the code follows is: choose a sentence that does not
 * need hyphenating, then break it without a hyphen, and never hyphenate it
 * wrongly.
 */
const MAX_TOKEN_EM = RUNGS[RUNGS.length - 1].lineEm;

/** Where a clause ends, across the scripts the app ships. */
const CLAUSE_BREAK = ',，、;；:：—–';
/** Trailing marks a marker pen would stop short of. */
const TAIL_MARKS = '.。!！?？,，、;；:： ';

/**
 * A line shorter than this is already emphatic and gets no wash.
 *
 * Highlighting half of a six-word sentence does not read as emphasis, it reads
 * as a second colour. The shortest sentences land on the largest rung, where
 * the type is doing the emphasis on its own.
 */
const MIN_EM_FOR_WASH = 14;
/** A wash over most of the line is a fill; under a fifth is a smudge. */
const WASH_MIN_SHARE = 0.12;
const WASH_MAX_SHARE = 0.55;

/** Walk back from the end until `targetEm` is covered; returns the start index. */
function startOfTrailingEm(line: string, targetEm: number): number {
  let em = 0;
  let index = line.length;
  while (index > 0 && em < targetEm) {
    index -= 1;
    em += estimateEm(line[index]);
  }
  return index;
}

/**
 * The phrase the highlighter goes under.
 *
 * It takes the tail of the sentence rather than hunting for a keyword, and
 * that is the whole idea: the payoff of a sentence is at its end in every
 * language the app ships, whereas "the important word" is a semantic judgment
 * no client-side heuristic makes well in 106 of them. A wash on the last
 * clause reads as someone underlining while they read. A wash on a word an
 * algorithm guessed at reads as a machine that has misunderstood the sentence.
 *
 * Preference order: the final clause, if a break leaves one of a usable size;
 * otherwise the trailing third, snapped back to a word boundary in the scripts
 * that have words. Returns null rather than forcing one, because no wash is a
 * perfectly good cover and a badly placed one is not.
 */
export function pickHighlight(keyLine: string): CoverHighlight | null {
  const line = keyLine.trim();
  const total = estimateEm(line);
  if (!line || total < MIN_EM_FOR_WASH) return null;

  let start = -1;
  for (let i = line.length - 1; i > 0; i -= 1) {
    if (!CLAUSE_BREAK.includes(line[i])) continue;
    let candidate = i + 1;
    while (candidate < line.length && line[candidate] === ' ') candidate += 1;
    const share = estimateEm(line.slice(candidate)) / total;
    if (share >= WASH_MIN_SHARE && share <= WASH_MAX_SHARE) start = candidate;
    break;
  }

  if (start < 0) {
    start = startOfTrailingEm(line, total * 0.32);
    // Snap onto a word, where there are words. Landing mid-word paints half a
    // token and is the single most obviously generated thing a cover could do.
    //
    // Backwards first, forwards when backwards overshoots. A long compound
    // straddling the target pulls the whole word in, and in German that word
    // can be most of the sentence — "Aufenthaltstitel für diesen Weg" is 64%
    // of its line, which is a panel rather than a wash. Dropping the compound
    // and washing what follows it is the better of the two readings, and
    // refusing outright (what this did first) threw away a usable one.
    if (!NO_SPACE_BREAK.test(line)) {
      const back = line.lastIndexOf(' ', start);
      const snapped = back > 0 ? back + 1 : start;
      if (estimateEm(line.slice(snapped)) / total <= WASH_MAX_SHARE) {
        start = snapped;
      } else {
        const forward = line.indexOf(' ', start);
        start = forward > 0 ? forward + 1 : snapped;
      }
    }
  }

  let end = line.length;
  while (end > start && TAIL_MARKS.includes(line[end - 1])) end -= 1;

  const span = line.slice(start, end);
  const share = estimateEm(span) / total;
  // `before` must survive: a wash over the entire line is a coloured panel.
  if (!span.trim() || !line.slice(0, start).trim()) return null;
  if (share < WASH_MIN_SHARE || share > WASH_MAX_SHARE) return null;

  return { before: line.slice(0, start), span, after: line.slice(end) };
}

/**
 * The stamp in the margin.
 *
 * Keyed off `odyssey_slug` and `post_type`, never off the words on the cover.
 * The cover is translated per reader at request time, so an English keyword
 * list would match for English readers and silently give everyone else the
 * fallback — the failure would be invisible in the language the project
 * reviews UI in. A slug is the same string in all 106.
 */
const SLUG_STICKERS: [RegExp, string][] = [
  [/recognition|qualification/, '📜'],
  [/study|graduate|university|school|kita/, '🎓'],
  [/vocational|training|ausbildung/, '🔧'],
  [/blue_card|opportunity|visa|residence|permit|anmeldung|einbuergerung/, '🛂'],
  [/family|reunification|child/, '👪'],
  [/salary|tax|bank|money|schufa|gez|insurance|wise/, '💶'],
  [/job|application|work|employment|contract|business/, '💼'],
  [/health|doctor|medical|checkup/, '🩺'],
  [/language|german|vhs|exchange/, '🗣️'],
  [/housing|apartment|ummeldung|sim|bvg|ticket|airport|transit/, '🔑'],
  [/food|market|museum|flea|boat|tour|sight|sport|volunteer/, '🌿'],
];

const TYPE_STICKERS: Record<string, string> = {
  guide: '🧭',
  question: '💬',
  recommendation: '✨',
  experience: '🌱',
  warning: '⚠️',
};

export function coverSticker(postType: string, odysseySlug?: string | null): string | null {
  const slug = (odysseySlug || '').toLowerCase();
  if (slug) {
    for (const [pattern, emoji] of SLUG_STICKERS) {
      if (pattern.test(slug)) return emoji;
    }
  }
  return TYPE_STICKERS[postType] ?? null;
}

/**
 * The big mark behind the text.
 *
 * Typographic, not the sticker enlarged. The first attempt was exactly that —
 * the emoji at eleven times the size and a tenth of the opacity — and a faded
 * picture is not the same thing as a grey mark: a washed-out banknote still
 * reads as a banknote, sits behind the words as a second image competing with
 * them, and keeps its own hue no matter how faint. A glyph takes `palette.dot`
 * and is therefore actually grey, actually flat, and actually stock.
 *
 * Only the themes with an honest mark get one. The rest take the epigraph's
 * own quotation mark, which is not a fallback so much as the literal truth
 * about the card: it prints one sentence lifted out of a longer post. Nothing
 * here is outside Latin-1 and General Punctuation, so every platform has it in
 * text presentation — an emoji-presented glyph would come back coloured on
 * some devices and grey on others, which is the bug this is fixing.
 */
const SLUG_MARKS: [RegExp, string][] = [
  [/recognition|qualification/, '§'],
  [/salary|tax|bank|money|schufa|gez|insurance|wise/, '€'],
  [/blue_card|opportunity|visa|residence|permit|anmeldung|ummeldung|einbuergerung/, '→'],
  [/job|application|work|employment|contract|business/, '¶'],
  [/health|doctor|medical|checkup/, '+'],
];

const TYPE_MARKS: Record<string, string> = { question: '?', warning: '!' };

export function coverMark(postType: string, odysseySlug?: string | null): string {
  const slug = (odysseySlug || '').toLowerCase();
  if (slug) {
    for (const [pattern, glyph] of SLUG_MARKS) {
      if (pattern.test(slug)) return glyph;
    }
  }
  return TYPE_MARKS[postType] ?? '“';
}

export function coverPlan(
  post: {
    id: string;
    post_type: string;
    title: string;
    body: string;
    odyssey_slug?: string | null;
  },
  displayTitle: string,
  displayBody: string,
): CoverPlan {
  // Stable per post: the feed loops (feed_round), and a reader scrolling back
  // must meet the same object rather than a reshuffled one. It picks the
  // ground and now the stock too, so two guides in one screenful are no longer
  // the same card twice — which was the other half of "too uniform".
  const seed = post.id.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const palette = coverPalette(post.post_type, seed % 2);
  const keyLine = pickKeyLine(displayBody || post.body, displayTitle || post.title);
  const em = keyLine ? estimateEm(keyLine) : 0;

  // Two constraints, not one. The sentence has to fit the block, and its
  // longest word has to fit a line — a token wider than one line is broken
  // mid-word by every renderer we target, with no hyphen, which reads as a
  // typo. German is the reason the second constraint exists.
  //
  // This was a clamp against the constant 9, which is the *last* rung's line
  // capacity applied to all four. The four lines hold 5.80 / 6.80 / 8.13 /
  // 9.26 em, so "Der Aufenthaltstitel gilt." — a short sentence, and a token
  // of about 8em — landed on the largest rung, whose line holds 5.80, and
  // broke mid-word while the clamp watched. Each rung is asked about its own
  // line now. Same mistake as the hand-picked boundaries above: one rung's
  // number standing in for a property of all of them.
  const longest = keyLine ? longestTokenEm(keyLine) : 0;
  const rung =
    RUNGS.find((r) => em <= r.capacityEm && longest <= r.lineEm) ??
    RUNGS[RUNGS.length - 1];
  const sizeRatio = rung.sizeRatio;

  // A sentence past the last rung's capacity is clipped at a word, which this
  // file calls the honest failure and it is. What is not honest is putting the
  // highlighter on the part that got cut: "…and your federal state, so there is"
  // ends mid-clause, and washing "so there is" points at the damage. The tail is
  // where the wash goes and the tail is exactly what clipping takes, so when the
  // line clips there is no phrase left worth marking.
  const clips = em > rung.capacityEm;

  const ground = (['dotted', 'plain'] as const)[(seed >>> 3) % 2];

  const sticker = coverSticker(post.post_type, post.odyssey_slug);

  return {
    palette,
    keyLine,
    highlight: clips ? null : pickHighlight(keyLine),
    sticker,
    watermark: coverMark(post.post_type, post.odyssey_slug),
    sizeRatio,
    leading: rung.leading,
    maxLines: rung.maxLines,
    ground,
    isBlank: keyLine.length === 0,
  };
}
