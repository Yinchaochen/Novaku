/**
 * Pouring a post across pages (D-142).
 *
 * The rules being held: nothing breaks mid-sentence, nothing is lost that the
 * reader would miss, the credit block never becomes a card, and the stack
 * stays short enough to be an invitation rather than a chore.
 */

import { linesFor, MAX_PAGES, paginateBody } from '../coverPages';
import { splitSentences } from '../postCover';

/** Lines a page holds, mirrored from the module's own BODY_LINES. */
const PAGE_LINES = 9;
const GAP_LINES = 0.55;

/** What a page actually costs in lines, gaps between paragraphs included. */
function pageLines(paragraphs: string[]): number {
  return paragraphs.reduce(
    (sum, paragraph, index) => sum + linesFor(paragraph) + (index > 0 ? GAP_LINES : 0),
    0,
  );
}

const GUIDE = [
  'You need an apartment first, then the Wohnungsgeberbestaetigung from your landlord.',
  'That confirmation is what you need before you can do Anmeldung. So if you are still looking, keep that document in mind from the start.',
  'It is not an extra later step. It is part of the first one, and treating it as an afterthought is what costs people a month.',
].join('\n\n');

describe('paginateBody', () => {
  it('keeps a short post to a single page', () => {
    const pages = paginateBody('One short paragraph, nothing more to say about it.');

    expect(pages).toHaveLength(1);
  });

  it('gives nothing back for a body with no prose in it', () => {
    expect(paginateBody('')).toEqual([]);
    expect(paginateBody('   \n\n  ')).toEqual([]);
  });

  it('loses no word of the body it pages', () => {
    const pages = paginateBody(GUIDE);
    const poured = pages
      .flatMap((page) => page.paragraphs)
      .join(' ')
      .replace(/\s+/g, ' ');

    for (const word of GUIDE.replace(/\s+/g, ' ').split(' ')) {
      expect(poured).toContain(word);
    }
  });

  it('never ends a page mid-sentence', () => {
    // Long enough that the pager has to make real decisions about where to cut.
    const long = new Array(12)
      .fill(
        'Health insurance is mandatory in Germany and you usually need it before your residence process is complete.',
      )
      .join('\n\n');
    const pages = paginateBody(long);

    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) {
      for (const paragraph of page.paragraphs) {
        // Every piece on a page is one or more whole sentences: splitting it
        // and rejoining it has to return it unchanged.
        expect(splitSentences(paragraph).join(' ')).toBe(paragraph);
      }
    }
  });

  it('splits a paragraph too long for any page at its sentences', () => {
    const wall = new Array(30)
      .fill('This sentence is a perfectly ordinary length for prose.')
      .join(' ');
    const pages = paginateBody(wall);

    expect(pages.length).toBeGreaterThan(1);
  });

  it('never lets a page run off the bottom of its card', () => {
    // The gallery caught this on the first render: counting ems and dividing
    // at the end ignores the part-empty last line of every paragraph and the
    // gap between two of them, and the final page of a five-page guide ran
    // over its edge by about exactly that. Capacity is counted in lines now.
    const bodies = [
      GUIDE,
      new Array(9)
        .fill('Health insurance is mandatory here and you usually need it before your residence process is complete.')
        .join('\n\n'),
      new Array(20).fill('This sentence is a perfectly ordinary length for prose.').join(' '),
      new Array(8).fill('柏林的租房合同里有一条关于押金的条款，值得在签字之前读两遍。').join('\n\n'),
    ];

    for (const body of bodies) {
      for (const page of paginateBody(body)) {
        // A single unbreakable piece may exceed a page on its own -- one
        // sentence with nowhere to go. Anything the pager CHOSE to put
        // together must fit.
        const single = page.paragraphs.length === 1 && splitSentences(page.paragraphs[0]).length === 1;
        if (!single) expect(pageLines(page.paragraphs)).toBeLessThanOrEqual(PAGE_LINES);
      }
    }
  });

  it('never makes a card out of the credit block', () => {
    // Seeded posts end in "Source: kulturdaten.berlin" / "Photo: ...". That is
    // attribution; it stays in the text below and never becomes a page.
    const body = 'A real paragraph with something in it.\n\nSource: kulturdaten.berlin\nPhoto: Someone (CC BY-SA)';
    const pages = paginateBody(body);

    expect(pages).toHaveLength(1);
    expect(pages[0].paragraphs.join(' ')).not.toContain('kulturdaten');
  });

  it('stops paging rather than growing a stack nobody will swipe', () => {
    const huge = new Array(200)
      .fill('Another paragraph of roughly ordinary length, saying something.')
      .join('\n\n');

    // MAX_PAGES counts the cover, which this function does not produce.
    expect(paginateBody(huge).length).toBeLessThanOrEqual(MAX_PAGES - 1);
  });

  it('pages Chinese, which has no spaces to break on', () => {
    const zh = new Array(10).fill('柏林的租房合同里有一条关于押金的条款，值得在签字之前读两遍。').join('\n\n');
    const pages = paginateBody(zh);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages.every((page) => page.paragraphs.length > 0)).toBe(true);
  });
});
