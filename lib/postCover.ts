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
 * The phrase the rule goes under, and the text either side of it.
 *
 * Three parts rather than an index pair because the renderer sets them as
 * separate blocks: the phrase gets one of its own so a rounded rule can be
 * drawn under it at exactly the width of its text. `coverPlan` is what refuses
 * a phrase that will not fit that line — the picker only reads the sentence.
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
  /** The family the author chose, or null when nobody chose (D-141). */
  template: CoverTemplateId | null;
  /** Where the words sit on the card (D-146). */
  layout: CoverLayout;
  /** A cover with no sentence worth lifting: header and paper, nothing false. */
  isBlank: boolean;
}

/**
 * Nine stocks, spread across a post's id, measured off Xiaohongshu's wall.
 *
 * lisum asked twice whether their colours could simply be copied, and the
 * measured answer was no both times: cream #F7F3E6 sits ΔE 3.7 from our page,
 * ivory 3.3, near-white 2.9, and D-088 had already measured that exact failure
 * at "14 units" and called the card invisible. Two rounds were spent building
 * around it — cool stocks, then a solver for the least chroma that clears the
 * page, which collapsed all ten to the same grey and made the thing MORE
 * uniform, not less.
 *
 * Then the premise was rechecked rather than the arithmetic, and the premise
 * had expired. D-088 measured a FLAT panel. This cover is no longer flat: it
 * carries a watermark bleeding off one corner, a dot field, a margin rule and a
 * 12dp corner radius. Rendered on the real page, their creams hold their edge
 * on structure instead of on fill — so the card is defined the way a sheet of
 * paper on a desk is, by what is printed on it, not by being a different colour
 * from the desk. D-088's two rejected escapes stay rejected: no border was
 * added and the page is still cream.
 *
 * That is also why `ground` is no longer a coin flip. A 'plain' variant would
 * be a fill with nothing on it, which on these stocks is genuinely the
 * invisible card D-088 warned about — and it was half of what lisum meant by
 * the backgrounds being too plain. Every cover is dotted now.
 *
 * The second half of the note — "多种颜色在一起" — is the wash. The stocks this
 * replaced put a butter wash on butter paper: one hue per card, which is
 * exactly why they read flat beside a cover whose cream ground carries a BLUE
 * cloud. Every pair here is a near-neutral or soft ground against a wash from a
 * different family.
 *
 * Held by the tests: ink ≥ 7:1 on both paper and wash, wash ≥ 12 ΔE from its
 * own paper and a genuinely different colour from it, dots ≥ 1.25:1 so the
 * structure that now carries the edge is actually visible.
 */
/** Warm near-black, the ink on every default stock. */
const DEFAULT_INK = '#3A2E26';

const DEFAULT_STOCKS: CoverPalette[] = [
  { paper: '#DBFFD5', dot: '#C4E2BD', secondary: '#6C6F5C', ink: DEFAULT_INK, accent: '#7E8272', wash: '#DCCBF2' },
  { paper: '#FFE1ED', dot: '#E3C8D1', secondary: '#736260', ink: DEFAULT_INK, accent: '#8A7674', wash: '#FCEEA0' },
  { paper: '#FFFFDB', dot: '#E4E3C3', secondary: '#797160', ink: DEFAULT_INK, accent: '#8D8674', wash: '#E7C9E8' },
  { paper: '#E7EDF9', dot: '#CFD2DB', secondary: '#6E6765', ink: DEFAULT_INK, accent: '#827B79', wash: '#FCEEA0' },
  { paper: '#F9F3FF', dot: '#DFD8E2', secondary: '#756B69', ink: DEFAULT_INK, accent: '#8A7F7D', wash: '#FCE0A8' },
  { paper: '#D5E7F3', dot: '#BFCDD6', secondary: '#65625F', ink: DEFAULT_INK, accent: '#787472', wash: '#F7D2B0' },
  { paper: '#F9CFDB', dot: '#DCB7C0', secondary: '#6C5855', ink: DEFAULT_INK, accent: '#816A67', wash: '#CDE8C4' },
  { paper: '#EDFFE7', dot: '#D4E2CC', secondary: '#716F62', ink: DEFAULT_INK, accent: '#85837A', wash: '#F3C6D6' },
  { paper: '#EDE7DB', dot: '#D4CDC2', secondary: '#6C6259', ink: DEFAULT_INK, accent: '#80766C', wash: '#BEE0F5' },
];

/**
 * The stock a post gets when nobody chose one, spread by the post's id.
 *
 * Not by post type any more, and that is the reversal lisum asked for on
 * 2026-09-15 after seeing the finished wall: "他们的文字的背景色是不一样的,
 * 更加五彩缤纷一些". He was right and the arithmetic says so. Two stocks per
 * type sounds like variety until you look at a real feed: almost every seeded
 * post is a `guide`, so almost every card drew one of two creams, and a wall
 * of them is one colour. The type is still on the card -- it is printed as the
 * rubric, and it still picks the mark and the sticker. What it no longer picks
 * is the colour, because colour was carrying a signal nobody reads and hiding
 * one everybody does.
 */
export function defaultStock(seed: number): CoverPalette {
  return DEFAULT_STOCKS[((seed % DEFAULT_STOCKS.length) + DEFAULT_STOCKS.length) % DEFAULT_STOCKS.length];
}

export const DEFAULT_STOCK_COUNT = DEFAULT_STOCKS.length;

/**
 * The composition a post gets when nobody chose one (D-146).
 *
 * The families gave the four layouts to authors, and almost no author uses
 * them: the wall is mostly seeded posts, which choose nothing, so the wall was
 * one composition drawn nine colours. Colour alone is what lisum had already
 * called too simple once.
 *
 * Shifted off a different part of the id than the stock, so a card's colour
 * and its composition are independent — pairing them would produce nine fixed
 * card designs instead of thirty-six, and a reader would learn the pairing
 * long before running out of feed.
 */
const DEFAULT_LAYOUTS: CoverLayout[] = ['journal', 'masthead', 'plate', 'journal', 'poster'];

export function defaultLayout(seed: number): CoverLayout {
  const shifted = Math.floor(seed / DEFAULT_STOCKS.length);
  return DEFAULT_LAYOUTS[((shifted % DEFAULT_LAYOUTS.length) + DEFAULT_LAYOUTS.length) % DEFAULT_LAYOUTS.length];
}

/* ------------------------------------------------------------------ *
 * Template families (D-141)
 *
 * The stocks above are what a post gets when nobody chose anything, and they
 * are deliberately papery: a near-neutral ground carrying one wash. That is
 * one register, and one register is what lisum saw the limit of when he put a
 * Xiaohongshu recording beside ours on 2026-09-15.
 *
 * Theirs is not one register with more colours in it. Their composer offers
 * named FAMILIES, and each family carries its own colour set — I sampled them
 * out of the recording rather than guessing:
 *
 *   优雅几何 / 平实叙事  #F6CE72 #76CEFA #FAF29E #8AFA9A #BAFEC6 #AAE6FE
 *   黄昏手稿            #FAE6C6 #E2AAB2 #7E8AC6 #BAAA76
 *   (the inverted one)   paper #1E1E1E, headline #FAEA92
 *
 * Two families, two worlds. The first six are candy: chroma 30-60, all of them
 * light. The second four are dusty: same hues, a third of the chroma, and one
 * of them (#7E8AC6) is genuinely mid-tone. A card from one set can never be
 * mistaken for a card from the other, and THAT is what makes a wall of their
 * text notes look composed rather than random — not the individual colours.
 *
 * So the author picks a family and then a colour inside it, and the family
 * decides what that colour becomes. The rendered card is never the swatch: I
 * measured their green swatch #8AFA9A rendering as paper #DEFADE and their
 * blue #76CEFA as #DAEAFA — a 72% tint both times. Picking a strong colour and
 * being given its quiet tint is the whole trick, and it is why their bold
 * covers stay readable.
 * ------------------------------------------------------------------ */

function channels(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

function toHex(rgb: number[]): string {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Mix `hex` toward `target` by t. t=0 keeps the colour, t=1 is the target. */
function mix(hex: string, target: string, t: number): string {
  const a = channels(hex);
  const b = channels(target);
  return toHex(a.map((c, i) => c + (b[i] - c) * t));
}

export type CoverTemplateId =
  | 'notebook'
  | 'bold'
  | 'night'
  | 'manuscript'
  | 'mono'
  | 'rules'
  | 'blocks'
  | 'magazine'
  | 'vertical';

/**
 * How a cover is composed — where the words sit and what else is on the card.
 *
 * Colour was the first axis and it is not enough on its own: four families in
 * four palettes still drew one picture four times, which is what lisum meant
 * on 2026-09-15 by 只是加上 emoji 太过于简单了. Their template rail is not a
 * colour rail — 优雅几何 and 黄昏手稿 and 逻辑结构 put the type in genuinely
 * different places on the page.
 *
 *  - `journal`   the page of a notebook: rubric top left, the sentence set
 *                from the top, a mark bleeding off the top right corner, a
 *                stamp down in the margin. What every cover drew until now.
 *  - `masthead`  a solid band across the head of the card carrying the rubric
 *                in reversed type, the sentence below it. The band is the
 *                graphic, so there is no watermark competing with it.
 *  - `poster`    the sentence sits along the BOTTOM and the mark is enormous
 *                above it — their inverted card, where the title is low and
 *                the field above it is the design.
 *  - `plate`     the sentence centred on both axes between two hairlines,
 *                rubric centred above. No stamp: a plate is quiet or it is
 *                not a plate.
 */
export type CoverLayout =
  | 'journal'
  | 'masthead'
  | 'poster'
  | 'plate'
  | 'mono'
  | 'rules'
  | 'blocks'
  | 'magazine'
  | 'vertical';

export interface CoverTemplate {
  id: CoverTemplateId;
  /** Where the words sit on the card. */
  layout: CoverLayout;
  /** The colours an author may pick inside this family. */
  swatches: string[];
  /** Dots or a bare ground. Only the notebook keeps its dot field. */
  ground: 'dotted' | 'plain';
  /**
   * Multiplier on the type size. A family that fills the card with colour has
   * to fill it with type as well, or the colour is just a large empty panel.
   */
  scale: number;
  /**
   * The share of the measure this layout's text actually gets.
   *
   * A layout that puts furniture beside the words — two rules, a padded block
   * — leaves them a narrower line, and the size ladder has to be told, exactly
   * as it has to be told about `scale`. The gallery showed this the moment
   * `rules` and `blocks` first rendered: both ended "five statutory ...",
   * because the rung had been chosen for a line 15% wider than the one drawn.
   */
  measure?: number;
  /**
   * Whether this family draws the highlighter rule at all.
   *
   * The dusk family does not, and that is a finding rather than a taste: I
   * searched the whole (tint, wash) space for a pair that keeps 7:1 ink on
   * BOTH the ground and the swipe while leaving the swipe visible against the
   * ground, and for a mid-tone stock like #7E8AC6 no such pair exists. Their
   * own dusk cards draw no highlighter either - the family's device is ruled
   * text on a tinted stock. A highlighter you cannot read through is not a
   * highlighter, so the family goes without one instead of faking it.
   */
  highlight: boolean;
}

/** The candy set, straight off their 优雅几何 and 平实叙事 rails. */
const BRIGHT_SWATCHES = ['#F6CE72', '#76CEFA', '#FAF29E', '#8AFA9A', '#BAFEC6', '#AAE6FE'];

/** Their 黄昏手稿 set: same hues at a third of the chroma. */
const DUSK_SWATCHES = ['#FAE6C6', '#E2AAB2', '#7E8AC6', '#BAAA76'];

/** The washes the papery stocks already use, so the notebook's row is its own. */
const NOTEBOOK_SWATCHES = ['#BEE0F5', '#FCEEA0', '#F7D2B0', '#CDE8C4', '#DCCBF2', '#F3C6D6'];

/**
 * 黑白极简 — the paper itself is the choice, including a black one.
 * Their own swatch row for this family is cream / white / black.
 */
const MONO_SWATCHES = ['#FBFAF7', '#F2EDE2', '#1A1A1A'];

/** 逻辑结构 — the swatch is the RULE, not the ground: crimson, bronze, blue. */
const RULE_SWATCHES = ['#B3121F', '#A67C2A', '#1668C8'];

export const COVER_TEMPLATES: Record<CoverTemplateId, CoverTemplate> = {
  notebook: { id: 'notebook', layout: 'journal', swatches: NOTEBOOK_SWATCHES, ground: 'dotted', scale: 1, highlight: true },
  bold: { id: 'bold', layout: 'masthead', swatches: BRIGHT_SWATCHES, ground: 'plain', scale: 1.16, highlight: true },
  night: { id: 'night', layout: 'poster', swatches: BRIGHT_SWATCHES, ground: 'plain', scale: 1.16, highlight: true },
  manuscript: { id: 'manuscript', layout: 'plate', swatches: DUSK_SWATCHES, ground: 'dotted', scale: 0.92, highlight: false },
  mono: { id: 'mono', layout: 'mono', swatches: MONO_SWATCHES, ground: 'plain', scale: 1.08, highlight: false },
  rules: { id: 'rules', layout: 'rules', swatches: RULE_SWATCHES, ground: 'plain', scale: 1, measure: 0.84, highlight: false },
  blocks: { id: 'blocks', layout: 'blocks', swatches: BRIGHT_SWATCHES, ground: 'plain', scale: 1.04, measure: 0.88, highlight: false },
  magazine: { id: 'magazine', layout: 'magazine', swatches: DUSK_SWATCHES, ground: 'plain', scale: 1, highlight: true },
  vertical: { id: 'vertical', layout: 'vertical', swatches: DUSK_SWATCHES, ground: 'dotted', scale: 1, highlight: false },
};

export const COVER_TEMPLATE_IDS = Object.keys(COVER_TEMPLATES) as CoverTemplateId[];

export function isCoverTemplateId(value: unknown): value is CoverTemplateId {
  return typeof value === 'string' && value in COVER_TEMPLATES;
}

/** Warm near-black. The ink everywhere except the inverted family. */
const DAY_INK = '#3A2E26';

/**
 * The palette a family makes out of one swatch.
 *
 * Every number here was tuned against the contrast tests rather than chosen:
 * the wash sits BEHIND the sentence, so `contrast(ink, wash) >= 7` is what
 * decides how far each family may push its colour, and the families differ in
 * how far that is because their swatches start in different places.
 */
export function templatePalette(id: CoverTemplateId, swatchIndex: number): CoverPalette {
  const template = COVER_TEMPLATES[id];
  const swatch = template.swatches[((swatchIndex % template.swatches.length) + template.swatches.length) % template.swatches.length];

  if (id === 'notebook') {
    // The ground stays paper and the swatch is the highlighter — the existing
    // stocks' own arrangement, with the choice handed to the author.
    return {
      paper: '#F7F3E6', dot: '#DAD6CA', secondary: '#6A6862',
      ink: DAY_INK, accent: '#7C7765', wash: swatch,
    };
  }

  if (id === 'mono') {
    // 黑白极简: the swatch IS the stock, black included. Everything else is
    // the same colour at different strengths -- a family with a second hue in
    // it is not this family.
    const dark = swatch === '#1A1A1A';
    const ink = dark ? '#F2EDE2' : '#111111';
    return {
      paper: swatch,
      dot: mix(swatch, ink, 0.12),
      secondary: mix(swatch, ink, dark ? 0.55 : 0.72),
      ink,
      accent: mix(swatch, ink, 0.55),
      wash: mix(swatch, ink, dark ? 0.24 : 0.14),
    };
  }

  if (id === 'rules') {
    // 逻辑结构: the swatch is the pair of rules that flank the sentence, not
    // the ground. The ground stays near-white so the rules can be as strong as
    // they are -- crimson at full strength on a tinted stock is a warning, not
    // a frame.
    return {
      paper: '#FBFAF7',
      dot: '#E4E1DC',
      // Darkened toward the ink rather than lightened toward the paper:
      // the bronze is the binding one, and a tint of it on near-white
      // came out at 2.5:1 -- a label nobody can read is not a label.
      secondary: mix(swatch, DAY_INK, 0.5),
      ink: DAY_INK,
      accent: swatch,
      wash: mix(swatch, '#FFFFFF', 0.84),
    };
  }

  if (id === 'blocks') {
    // 拼接色块: the sentence sits ON a solid block of colour rather than under
    // a highlighter. The block is the strongest thing on the card, so the
    // ground gives way to it entirely.
    const block = mix(swatch, '#FFFFFF', 0.12);
    return {
      paper: '#FEFDFB',
      dot: '#E8E5E0',
      secondary: mix('#FEFDFB', DAY_INK, 0.72),
      ink: DAY_INK,
      accent: swatch,
      wash: block,
    };
  }

  if (id === 'magazine') {
    // 杂志先锋: a pale stock, one strong accent spent on the chapter mark and
    // the rule under it, and the sentence set plain beneath.
    const paper = mix(swatch, '#FFFFFF', 0.88);
    return {
      paper,
      dot: mix(paper, DAY_INK, 0.1),
      secondary: mix(paper, DAY_INK, 0.72),
      ink: DAY_INK,
      accent: mix(swatch, DAY_INK, 0.2),
      // 0.45, which is the one tint that keeps ink at 7:1 on all four of
      // the dusk swatches AND stays 8 deltaE clear of its own pale stock.
      wash: mix(swatch, '#FFFFFF', 0.45),
    };
  }

  if (id === 'vertical') {
    // 札记集尘: their vertical family renders mid-tone, not near-white -- I
    // measured one of their cards at #AECAE6. Same tint as the manuscript.
    const paper = mix(swatch, '#FFFFFF', 0.5);
    return {
      paper,
      dot: mix(paper, DAY_INK, 0.12),
      secondary: mix(paper, DAY_INK, 0.82),
      ink: DAY_INK,
      accent: mix(swatch, DAY_INK, 0.35),
      wash: paper,
    };
  }

  if (id === 'night') {
    // Their inverted card: near-black stock, the swatch as the headline. The
    // wash cannot be the swatch here — it would erase the words it sits under
    // — so it is the swatch dropped most of the way to the stock, which reads
    // as a lit band rather than a highlighter.
    return {
      paper: '#1E1E1E',
      dot: mix('#1E1E1E', '#FFFFFF', 0.16),
      secondary: mix(swatch, '#1E1E1E', 0.32),
      ink: swatch,
      accent: swatch,
      wash: mix(swatch, '#1E1E1E', 0.88),
    };
  }

  // bold and manuscript: the card IS the colour. 0.72 is their measured tint
  // for the candy set; the dusk set stays twice as coloured (0.50) because it
  // starts at a third of the chroma - their own dusk cards render mid-tone,
  // and a dusk swatch tinted to 0.72 is just off-white. 0.50 is the lowest
  // tint that still clears 7:1 ink on all four (7.70 at the periwinkle).
  const whiten = id === 'bold' ? 0.72 : 0.5;
  const paper = mix(swatch, '#FFFFFF', whiten);
  return {
    paper,
    dot: mix(paper, DAY_INK, 0.12),
    secondary: mix(paper, DAY_INK, 0.82),
    ink: DAY_INK,
    accent: mix(swatch, DAY_INK, 0.3),
    // A highlighter has to be visible against the ground it is drawn on, so on
    // a coloured ground it is the swatch near full strength. The dusk family
    // draws none at all (see CoverTemplate.highlight), and its wash is its own
    // paper so nothing can accidentally paint with it.
    wash: id === 'bold' ? mix(swatch, '#FFFFFF', 0.14) : paper,
  };
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
export function isCreditBlock(paragraph: string): boolean {
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
export const MEASURE_UNITS = 12 / 18;

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
export const PACKING = 0.78;

type Rung = {
  sizeRatio: number;
  leading: number;
  maxLines: number;
  capacityEm: number;
  lineEm: number;
};

const RUNGS: Rung[] = [
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
export function pickHighlight(keyLine: string, maxEm = Infinity): CoverHighlight | null {
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

  // The rule is drawn under a block that holds one line, so a phrase wider
  // than a line walks forward to the next word until it fits. A shorter tail
  // is still a tail. Refusing instead would leave most covers unmarked: at the
  // smallest rung a line holds about nine ems, and a final clause is regularly
  // longer than that.
  // Measured through to the end of the line, not to `end`: whatever trails the
  // phrase is set beside it and takes width from the same line. Leaving the
  // full stop out of the sum cost the phrase its last word to an ellipsis.
  const noWords = NO_SPACE_BREAK.test(line);
  while (start < end && estimateEm(line.slice(start)) > maxEm) {
    if (noWords) {
      start += 1;
      continue;
    }
    const next = line.indexOf(' ', start);
    if (next < 0 || next + 1 >= end) break;
    start = next + 1;
  }

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

/**
 * The backend's closed theme vocabulary, which is what a user post has instead
 * of a slug.
 *
 * lisum asked for a sticker chosen from what the author wrote. Matching the
 * author's words on the client cannot do that: the cover is translated per
 * reader, so an English keyword list matches for English readers and hands
 * everyone else the fallback, invisibly. The classification already exists
 * server-side though — `community_posts.theme`, written deterministically by
 * the seeding lanes and by the AI enrichment pass for everything else (D-096),
 * from the ORIGINAL text, once. Fourteen tokens, identical in all 106 locales.
 *
 * It is also the list to commission artwork against when these become drawn
 * stickers rather than emoji: fourteen, plus the handful of slug specials.
 */
const THEME_STICKERS: Record<string, string> = {
  startup: '🚀',
  career: '💼',
  bureaucracy: '📋',
  housing: '🔑',
  money: '💶',
  health: '🩺',
  transport: '🚲',
  food_drink: '🍽️',
  culture: '🎭',
  places: '📍',
  education: '🎓',
  language: '🗣️',
  social: '👋',
  shopping: '🛍️',
};

const TYPE_STICKERS: Record<string, string> = {
  guide: '🧭',
  question: '💬',
  recommendation: '✨',
  experience: '🌱',
  warning: '⚠️',
};

export function coverSticker(
  postType: string,
  odysseySlug?: string | null,
  theme?: string | null,
): string | null {
  // Slug first: it is the most specific thing a post can carry, and a post that
  // has one is about that step rather than about its theme in general.
  const slug = (odysseySlug || '').toLowerCase();
  if (slug) {
    for (const [pattern, emoji] of SLUG_STICKERS) {
      if (pattern.test(slug)) return emoji;
    }
  }
  const themed = THEME_STICKERS[(theme || '').toLowerCase()];
  if (themed) return themed;
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

/**
 * How long the post takes to read, in whole minutes.
 *
 * Xiaohongshu prints this on the cover of a long note -- "全文6877字 · 阅读需14
 * 分钟" -- and it is the cheapest honest thing on that card: it tells the
 * reader what they are committing to before they commit. Our Odyssey guides
 * are exactly the length that needs it.
 *
 * Their own ratio is 6877/14 = 491 characters a minute, so 500 is theirs
 * rounded, and 200 words a minute is the ordinary figure for prose in a spaced
 * script. Which one applies is decided by the text rather than by the post's
 * language column: a German post quoting a Chinese sign is still German, and a
 * Chinese post is full of Latin place names.
 *
 * Returns 0 for anything short enough that the number would be noise. The
 * caller prints nothing at 0 rather than printing "1 min", which on a card
 * that already shows two lines of the post says nothing at all.
 */
export const READING_TIME_MIN_MINUTES = 3;

export function readingMinutes(body: string): number {
  const text = (body || '').trim();
  if (!text) return 0;
  const cjkChars = (text.match(/[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/gu) || []).length;
  // The two counts are in different units, so the CJK is taken OUT before the
  // words are counted rather than subtracted from them afterwards. Subtracting
  // characters from words is what the first version did, and it charged a post
  // of 2400 Chinese characters the same whether or not 400 English words were
  // sitting next to them.
  const words = text
    .replace(/[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = cjkChars / 500 + words / 200;
  const rounded = Math.round(minutes);
  return rounded >= READING_TIME_MIN_MINUTES ? rounded : 0;
}

export function coverPlan(
  post: {
    id: string;
    post_type: string;
    title: string;
    body: string;
    odyssey_slug?: string | null;
    theme?: string | null;
    /** The family the author picked, or null for the papery default (D-141). */
    cover_template?: string | null;
    /** Which colour inside that family. Ignored without a template. */
    cover_palette?: number | null;
  },
  displayTitle: string,
  displayBody: string,
): CoverPlan {
  // Stable per post: the feed loops (feed_round), and a reader scrolling back
  // must meet the same object rather than a reshuffled one. It picks the
  // ground and now the stock too, so two guides in one screenful are no longer
  // the same card twice — which was the other half of "too uniform".
  const seed = post.id.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  // An author who chose is obeyed; everybody else gets what they got before.
  // The default is not 'notebook' with a swatch picked for them — it is the
  // existing pair of stocks, because those carry variety this file spent two
  // rounds earning and a default template would flatten it back out.
  const template = isCoverTemplateId(post.cover_template) ? post.cover_template : null;
  const palette = template
    ? templatePalette(template, post.cover_palette ?? 0)
    : defaultStock(seed);
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

  // A family that sets 16% larger fits 16% less, so the SCALE IS APPLIED
  // BEFORE the rung is chosen, not after. Applying it afterwards is what the
  // first version did, and the dev gallery showed the result immediately:
  // every bold and night cover ended "...five statutory ..." because the rung
  // had been picked for type one size smaller than what was drawn.
  let scale = template ? COVER_TEMPLATES[template].scale : 1;
  // Narrower line, same type size: for the purpose of fitting, that is the
  // same thing as larger type on a full line.
  const measure = template ? COVER_TEMPLATES[template].measure ?? 1 : 1;
  const fits = (s: number) => {
    const fit = s / measure;
    return RUNGS.find((r) => em * fit <= r.capacityEm && longest * fit <= r.lineEm) ?? null;
  };

  let plain = fits(scale);
  if (plain === null && scale > 1) {
    // A long sentence in a family that sets 16% larger would run off the last
    // rung, and a card ending "...five statutory ..." is a worse outcome than
    // a card set at ordinary size. The family gives the extra size back and
    // keeps everything that actually identifies it — its stock, its ground,
    // its colour. Clipping stays reserved for a sentence no rung can hold.
    scale = 1;
    plain = fits(1);
  }
  if (plain === null && measure < 1) {
    // The mirror of the rule above. A layout that narrows its own line cannot
    // give width back — the furniture IS the family — but it can buy the width
    // back by setting smaller: at scale = measure the fit is exactly the
    // default's, and the type is the few per cent smaller that costs. Still
    // better than an ellipsis, which is what `rules` and `blocks` showed in
    // the gallery on a sentence the default sets whole.
    scale = measure;
    plain = fits(scale);
  }
  plain = plain ?? RUNGS[RUNGS.length - 1];
  const emFit = (em * scale) / measure;
  const longestFit = (longest * scale) / measure;

  // A sentence past the last rung's capacity is clipped at a word, which this
  // file calls the honest failure and it is. What is not honest is putting the
  // highlighter on the part that got cut: "…and your federal state, so there is"
  // ends mid-clause, and washing "so there is" points at the damage. The tail is
  // where the wash goes and the tail is exactly what clipping takes, so when the
  // line clips there is no phrase left worth marking.
  const clips = emFit > plain.capacityEm;

  // The rule is drawn under the phrase, not behind it, and that costs the
  // phrase a line of its own. A nested run inside a paragraph is the only
  // thing in RN that re-flows with the wrap, and the only mark it can carry is
  // a square band the full height of the line — which is the box this
  // replaced. A block that shrink-wraps its text can carry a rounded rule, but
  // a block starts on a new line.
  //
  // The phrase is cut to one line, and what is left of the sentence has to fit
  // the lines that remain. Where it does not, the rung below buys the line back
  // — the type is a shade smaller and the phrase keeps its mark. Asking the
  // rung the sentence already sits on and stopping there left the mark only on
  // short sentences, because a sentence that fills its rung has no spare line
  // by definition, and those are most of them.
  let rung = plain;
  let highlight: CoverHighlight | null = null;
  if (!clips && (!template || COVER_TEMPLATES[template].highlight)) {
    for (const r of RUNGS) {
      if (emFit > r.capacityEm || longestFit > r.lineEm) continue;
      // Nine tenths of the line, because estimateEm is an estimate: a wrapped
      // block absorbs the error in its wrap and a single line has nowhere to
      // put it but an ellipsis.
      const h = pickHighlight(keyLine, (r.lineEm * 0.9 * measure) / scale);
      if (!h || (estimateEm(h.before) * scale) / measure > r.lineEm * (r.maxLines - 1) * PACKING)
        continue;
      rung = r;
      highlight = h;
      break;
    }
  }
  // A family that fills the card with colour sets larger, so the colour reads
  // as the card's own rather than as a panel the words happen to sit on.
  const sizeRatio = rung.sizeRatio * scale;

  const sticker = coverSticker(post.post_type, post.odyssey_slug, post.theme);

  return {
    palette,
    keyLine,
    highlight,
    sticker,
    watermark: coverMark(post.post_type, post.odyssey_slug),
    sizeRatio,
    leading: rung.leading,
    maxLines: rung.maxLines,
    ground: template ? COVER_TEMPLATES[template].ground : 'dotted',
    template,
    layout: template ? COVER_TEMPLATES[template].layout : defaultLayout(seed),
    isBlank: keyLine.length === 0,
  };
}
