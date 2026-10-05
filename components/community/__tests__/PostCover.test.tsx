/**
 * The cover must stay drawable in every language the app ships.
 *
 * Plus Jakarta Sans is the brand face and it carries 721 codepoints: Latin,
 * Latin Extended, Vietnamese, nothing else. Parsing the shipped .ttf's cmap
 * shows U+0410 (Cyrillic А), U+0391 (Greek Α), U+67CF (柏), U+0627 (Arabic
 * alef) and U+0E01 (Thai ko kai) are all absent. Attaching it to this cover
 * would read as a brand improvement in review and would replace the text of
 * roughly 38 of the app's 106 locales with tofu boxes — silently, because a
 * missing glyph raises nothing.
 *
 * That is the whole reason for this file: nothing about the rendered output
 * would look wrong to the person making the change.
 */

import { render } from '@testing-library/react-native';

import { PostCover } from '../PostCover';
import * as CoverStickerModule from '../CoverSticker';
import { COVER_FACES } from '../../../lib/coverFonts';
import { COVER_PACK_IDS, coverPlan, wrappedLines } from '../../../lib/postCover';
import type { CommunityPost } from '../../../features/community/useCommunity';

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  const Stub = (props: object) => <View {...props} />;
  // Every element the cover and its pack parts draw; a missing one renders as
  // `undefined` and fails on displayName rather than on the thing under test.
  const names = ['Svg', 'Circle', 'Defs', 'Line', 'Pattern', 'Rect', 'Path', 'Polygon', 'Polyline', 'Ellipse', 'G', 'RadialGradient', 'LinearGradient', 'Stop'];
  return { __esModule: true, default: Stub, ...Object.fromEntries(names.map((n) => [n, Stub])) };
});
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: object) => <View testID="expo-image" {...props} /> };
});
jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({ langCode: 'en', t: { plaza: { type_guide: 'Guide', type_question: 'Question' } } }),
}));

function makePost(over: Partial<CommunityPost> = {}): CommunityPost {
  return {
    id: 'p1',
    post_type: 'guide',
    title: 'Getting from BER into the city',
    body:
      'To get from BER into the city smoothly, use the quickest routes available: FEX, S9, S45.\n\n' +
      'For the city trip, remember that an ABC ticket is needed.',
    translated_title: null,
    translated_body: null,
    ...over,
  } as unknown as CommunityPost;
}

/**
 * The sentence as the reader sees it, re-joined.
 *
 * The phrase that carries the rule is set as its own block so the block can
 * shrink to the width of its text, which is what lets the rule be the width of
 * the words. So the sentence is spread over sibling nodes and no single one of
 * them holds it — asking for the whole string finds nothing, which says
 * nothing about whether it was drawn. Spaces go too: the one at the break
 * belongs to the line break now and to neither side of it.
 */
function sentence(json: unknown): string {
  if (typeof json === 'string') return json.replace(/\s+/g, '');
  if (!json || typeof json !== 'object') return '';
  const node = json as { children?: unknown[] };
  return (node.children ?? []).map(sentence).join('');
}

/**
 * The phrase's block: the rule that marks it, and the type it is set in.
 *
 * Returns the rule's own geometry rather than the whole node, because what
 * this file needs to assert about it is arithmetic.
 */
function findRuleBlock(json: unknown): {
  rule: { bottom: number; height: number };
  type: { fontSize: number; lineHeight: number };
  ruleIsFirst: boolean;
} | null {
  if (!json || typeof json !== 'object') return null;
  const node = json as { children?: unknown[] };
  const kids = (node.children ?? []).filter((c) => c && typeof c === 'object') as {
    props?: { style?: unknown };
    children?: unknown[];
  }[];
  const flat = (k: (typeof kids)[number]) =>
    Object.assign({}, ...(Array.isArray(k.props?.style) ? k.props!.style! : [k.props?.style]));
  const rule = kids.findIndex((k) => {
    const st = flat(k) as Record<string, unknown>;
    return st.position === 'absolute' && typeof st.borderRadius === 'number';
  });
  const text = kids.findIndex((k) => {
    const st = flat(k) as Record<string, unknown>;
    return typeof st.fontSize === 'number' && st.position !== 'absolute';
  });
  if (rule >= 0 && text >= 0) {
    const r = flat(kids[rule]) as { bottom: number; height: number };
    const t = flat(kids[text]) as { fontSize: number; lineHeight: number };
    return { rule: r, type: t, ruleIsFirst: rule < text };
  }
  for (const kid of kids) {
    const found = findRuleBlock(kid);
    if (found) return found;
  }
  return null;
}

/** Every style object in the rendered tree, flattened. */
function everyStyle(json: unknown): Record<string, unknown>[] {
  if (!json || typeof json !== 'object') return [];
  const node = json as { props?: { style?: unknown }; children?: unknown[] };
  const style = node.props?.style;
  const own = Array.isArray(style) ? style : style ? [style] : [];
  const nested = (node.children ?? []).flatMap(everyStyle);
  return [...(own as Record<string, unknown>[]), ...nested];
}

/** Every Text node: its flattened style, its own string children, and its line limit. */
function textNodes(json: unknown): { style: Record<string, unknown>; text: string; numberOfLines?: number }[] {
  if (!json || typeof json !== 'object') return [];
  const node = json as { type?: string; props?: { style?: unknown; numberOfLines?: number }; children?: unknown[] };
  const kids = node.children ?? [];
  const own =
    node.type === 'Text'
      ? [
          {
            style: Object.assign({}, ...[node.props?.style].flat(Infinity).filter(Boolean)) as Record<string, unknown>,
            text: kids.filter((k) => typeof k === 'string').join(''),
            numberOfLines: node.props?.numberOfLines,
          },
        ]
      : [];
  return [...own, ...kids.flatMap(textNodes)];
}

/** The first node, depth first, whose flattened style passes the test. */
function findNode(json: unknown, test: (style: Record<string, unknown>) => boolean): unknown {
  if (!json || typeof json !== 'object') return null;
  const node = json as { props?: { style?: unknown }; children?: unknown[] };
  const style = Object.assign({}, ...[node.props?.style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;
  if (test(style)) return node;
  for (const kid of node.children ?? []) {
    const found = findNode(kid, test);
    if (found) return found;
  }
  return null;
}

/** Every node in the rendered tree that carries a numberOfLines prop. */
function everyText(json: unknown): { props: { numberOfLines?: number } }[] {
  if (!json || typeof json !== 'object') return [];
  const node = json as { props?: { numberOfLines?: number }; children?: unknown[] };
  const own = node.props && 'numberOfLines' in node.props ? [node as { props: { numberOfLines?: number } }] : [];
  return [...own, ...(node.children ?? []).flatMap(everyText)];
}

describe('PostCover', () => {
  it('sets a face only where the bundled subset covers the words (D-148)', async () => {
    // The prohibition used to be absolute and its reason was measured: a face
    // with 721 codepoints would have boxed roughly 38 of 106 locales, silently.
    // It is conditional now — the app bundles a subset whose coverage
    // lib/displayFont.ts knows exactly — but the failure mode it guards has
    // not changed, so the guard has not gone away, only moved.
    const latin = await render(<PostCover post={makePost()} width={184.5} />);
    const families = everyStyle(latin.toJSON())
      .map((style) => style?.fontFamily)
      .filter(Boolean);
    expect(families).toEqual(['PosterviaDisplay-Bold']);

    const thai = await render(
      <PostCover post={makePost({ title: 'การลงทะเบียนในเบอร์ลิน' })} width={184.5} />,
    );
    for (const style of everyStyle(thai.toJSON())) {
      expect(style?.fontFamily).toBeUndefined();
    }
  });

  it('sets the title as the hero and a body sentence as the summary (D-147)', async () => {
    // Reverses D-135 rule 2. That rule kept the title off the card because the
    // feed prints it 10dp below; the cost was a card with one sentence in its
    // top third and nothing on the rest of it. Xiaohongshu's own long-post
    // cards are 标题 + 摘要 and repeat the title under the card as well — the
    // repetition costs far less than the emptiness did.
    const tree = await render(<PostCover post={makePost()} width={184.5} />);

    expect(tree.queryByText('Getting from BER into the city')).not.toBeNull();
    expect(sentence(tree.toJSON())).toContain(
      sentence('For the city trip, remember that an ABC ticket is needed.'),
    );
  });

  it('still refuses a summary that is only the title again', async () => {
    // The echo rule is MORE important now, not less: with the title printed
    // above it, a summary that restates it would print one sentence twice.
    const tree = await render(
      <PostCover
        post={makePost({
          title: 'Getting from BER into the city',
          body: 'To get from BER into the city, take the FEX.',
        })}
        width={184.5}
      />,
    );

    expect(tree.queryByText('Getting from BER into the city')).not.toBeNull();
    expect(sentence(tree.toJSON())).not.toContain(sentence('take the FEX'));
  });

  it('draws Chinese, which is what the server renderer could not do', async () => {
    const tree = await render(
      <PostCover
        post={makePost({ title: '从机场进城', body: '进城最快的是机场快线。记得买一张 ABC 区的票，否则会被罚款。' })}
        width={184.5}
      />,
    );

    expect(sentence(tree.toJSON())).toContain(sentence('记得买一张 ABC 区的票，否则会被罚款。'));
  });

  it('draws the rule over the baseline and beneath the glyphs', async () => {
    // Both halves of this were wrong on the first pass and neither showed up
    // as a failure. The rule was placed by subtracting the overlap from the
    // descender instead of adding it, which put a highlighter under the
    // descenders where it reads as a margin rule; and it was declared after
    // the text, which paints it over the words rather than behind them.
    // A short title, so the card has room to mark the phrase (D-166 sets the
    // sentence unmarked when the words before the phrase do not fit).
    const tree = await render(
      <PostCover
        post={makePost({
          post_type: 'question',
          title: 'Where do I register?',
          body: 'Has anyone booked one recently?\n\nMy Termin is three weeks out and the deadline is sooner.',
        })}
        width={184.5}
      />,
    );
    const block = findRuleBlock(tree.toJSON());

    expect(block).not.toBeNull();
    const { rule, type, ruleIsFirst } = block!;
    expect(ruleIsFirst).toBe(true);

    // Where the baseline sits, measured up from the bottom of the line box.
    const baseline = (type.lineHeight - type.fontSize) / 2 + type.fontSize * 0.21;
    expect(rule.bottom + rule.height).toBeGreaterThan(baseline);
    // And it may not reach the cap line, or it is a panel again.
    expect(rule.bottom + rule.height).toBeLessThan(baseline + type.fontSize * 0.7);
  });

  it('shows the title and no summary when the body has nothing to lift', async () => {
    // The type label went with every other label on 2026-09-15 (lisum: 封面只
    // 展示内容，不要加任何标签). A post too short to lift a sentence out of is
    // therefore its title alone — which is still a card, and still true.
    const tree = await render(<PostCover post={makePost({ title: 'Kurz', body: 'Ja.' })} width={184.5} />);

    expect(tree.getByText('Kurz')).toBeTruthy();
    expect(tree.queryByText('Guide')).toBeNull();
    expect(tree.queryByText('Ja.')).toBeNull();
  });
});

describe('the name tag', () => {
  it('writes the title on a HELLO badge and greets in the locale, falling back to English', async () => {
    // The strings come from the locale; the test mock carries none, so the
    // English fallback is what must appear.
    const tree = await render(
      <PostCover
        post={makePost({ cover_template: 'nametag', cover_palette: 0, title: 'Founder, CEO and also the intern' })}
        width={184.5}
      />,
    );
    expect(tree.getByText('HELLO')).toBeTruthy();
    expect(tree.getByText("I'M")).toBeTruthy();
    expect(tree.getAllByText('Founder, CEO and also the intern').length).toBeGreaterThan(0);
  });
});

describe('the collage', () => {
  it('lays the words on a slip and one plate on top', async () => {
    const tree = await render(
      <PostCover post={makePost({ cover_template: 'collage', cover_palette: 0 })} width={184.5} />,
    );
    expect(tree.getAllByTestId('expo-image')).toHaveLength(1);
    expect(tree.getAllByText('Getting from BER into the city').length).toBeGreaterThan(0);
  });
});

describe('fitting the words to the square', () => {
  const longGerman = {
    cover_template: 'stamp' as const,
    title: 'Architekturführung im Mies van der Rohe Haus',
    body:
      'Eine Führung durch das letzte Wohnhaus, das Mies in Deutschland gebaut hat, mit Garten, Möbeln und den Plänen von damals.',
  };

  it('never breaks a German compound: the title is sized so its longest word fits a line', async () => {
    const tree = await render(<PostCover post={makePost({ id: 'fit-1', ...longGerman })} width={184.5} />);
    const title = tree.getAllByText(longGerman.title)[0];
    const style = Object.assign({}, ...[title.props.style].flat(Infinity).filter(Boolean));
    // 'Architekturführung' is about 9 em; the stamp column is 12u of an 18u card.
    const u = 184.5 / 18;
    expect(style.fontSize * 9).toBeLessThanOrEqual(12 * u * 0.95 * 1.05);
  });

  it('shortens the summary rather than let it run off the bottom of the card', async () => {
    // A title that fills four lines and a summary that would fill six more, on
    // the narrowest card the gallery draws. Counted the way PostCover counts
    // (wrappedLines, in the family each line is drawn in): on the journal page
    // the words start at 3.4u and have to end by 17.1u.
    const crowded = {
      cover_template: 'crayon' as const,
      title: 'Wie man in Berlin eine Wohnung findet, ohne dabei den Verstand zu verlieren',
      body:
        'Die Wohnungssuche in Berlin ist ein Vollzeitjob mit Besichtigungen, Unterlagen, Schufa-Auskunft, ' +
        'Mietschuldenfreiheitsbescheinigung und Geduld, und wer neu in der Stadt ist, sollte früh anfangen und ' +
        'jede Besichtigung wahrnehmen, auch wenn die Wohnung auf dem Papier nicht perfekt aussieht.',
    };
    const u = 148 / 18;
    const family = (n: { style: Record<string, unknown> }) =>
      typeof n.style.fontFamily === 'string' ? n.style.fontFamily : null;
    let checked = 0;
    for (let i = 1; i <= 8; i += 1) {
      const post = makePost({ id: `crowd-${i}`, ...crowded });
      if (coverPlan(post, post.title, post.body).layout !== 'journal') continue;
      const nodes = textNodes((await render(<PostCover post={post} width={148} />)).toJSON());
      const title = nodes.find((n) => n.text === crowded.title)!;
      const titleLines = wrappedLines(crowded.title, family(title), title.style.fontSize as number, 12 * u);
      expect(titleLines).toBeLessThanOrEqual(4);
      const summaryU = nodes
        .filter((n) => n !== title && typeof n.numberOfLines === 'number')
        .reduce(
          (sum, n) =>
            sum +
            (Math.min(n.numberOfLines!, wrappedLines(n.text, family(n), n.style.fontSize as number, 12 * u)) *
              (n.style.lineHeight as number)) /
              u,
          0,
        );
      expect(3.4 + (titleLines * (title.style.lineHeight as number)) / u + 0.7 + summaryU).toBeLessThanOrEqual(17.1);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('counts the rubric above a mono page at its real height on a phone-width card', async () => {
    // The rubric's type has a 9.5px floor, so on a half-width phone card the
    // words start a unit lower than on a wide one; the summary pays for it.
    const crowded = {
      id: 'm-5',
      cover_template: 'journal' as const,
      title: 'Wie man in Berlin eine Wohnung findet, ohne dabei den Verstand zu verlieren',
      body:
        'Die Wohnungssuche in Berlin ist ein Vollzeitjob mit Besichtigungen, Unterlagen, Schufa-Auskunft, ' +
        'Mietschuldenfreiheitsbescheinigung und Geduld, und wer neu in der Stadt ist, sollte früh anfangen und ' +
        'jede Besichtigung wahrnehmen, auch wenn die Wohnung auf dem Papier nicht perfekt aussieht.',
    };
    const summaryLines = async (width: number) => {
      const tree = await render(<PostCover post={makePost(crowded)} width={width} />);
      return Math.max(
        ...everyText(tree.toJSON())
          .map((node) => node.props.numberOfLines)
          .filter((n): n is number => typeof n === 'number' && n !== 4 && n !== 1),
      );
    };
    expect(await summaryLines(170)).toBeLessThan(await summaryLines(362));
  });
});

describe('what the Android emulator showed (D-166)', () => {
  const PAYSLIP = {
    id: 'cmp',
    odyssey_slug: 'de_salary_and_deductions',
    title: 'Why your first payslip is smaller than you expected',
    body: 'The number in the contract is gross.\n\nBetween it and your bank account sit income tax and five statutory insurances.',
  };
  const SAMPLES = [
    {
      id: 'en',
      title: 'Registering your address in Berlin',
      body: 'Bring your passport and the rental contract.\n\nThe office opens at eight, and the queue is shortest then.',
    },
    {
      id: 'de',
      title: 'Architekturführung im Mies van der Rohe Haus',
      body: 'Eine Führung durch das letzte Wohnhaus, das Mies in Deutschland gebaut hat.\n\nBeginn um 15:00 Uhr, die Teilnahme kostet 6 Euro.',
    },
  ];

  it('never asks for a weight on a bundled face, because Android draws Roboto in its place', async () => {
    // Playfair (800), Caveat and Kalam (700) all came out as Roboto Bold, and
    // "Registering" broke in the middle because it was sized for Playfair.
    const bundled = new Set([...Object.values(COVER_FACES).map((f) => f.family), 'PosterviaDisplay-Bold']);
    let checked = 0;
    for (const pack of COVER_PACK_IDS) {
      for (const sample of SAMPLES) {
        const post = makePost({ ...sample, id: `${pack}-${sample.id}`, cover_template: pack });
        for (const node of textNodes((await render(<PostCover post={post} width={184.5} />)).toJSON())) {
          if (typeof node.style.fontFamily !== 'string' || !bundled.has(node.style.fontFamily)) continue;
          checked += 1;
          expect([undefined, 'normal', '400']).toContain(node.style.fontWeight);
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('sets a title a size down until it wraps into the four lines it is given', async () => {
    // The rules column is 10.2u: "Why your / first payslip / is smaller / than you ex…".
    const nodes = textNodes(
      (await render(<PostCover post={makePost({ ...PAYSLIP, cover_template: 'rules' })} width={184.5} />)).toJSON(),
    );
    const title = nodes.find((n) => n.text === PAYSLIP.title)!;
    expect(title.numberOfLines).toBe(4);
    const u = 184.5 / 18;
    expect(
      wrappedLines(PAYSLIP.title, title.style.fontFamily as string, title.style.fontSize as number, 10.2 * u),
    ).toBeLessThanOrEqual(4);
  });

  it('leaves a plain colour block its whole sentence, since it draws no title to make room for', async () => {
    // "...income tax and five st…" in a block with half the card empty under it.
    const nodes = textNodes(
      (await render(<PostCover post={makePost({ ...PAYSLIP, cover_template: 'blocks' })} width={184.5} />)).toJSON(),
    );
    const limits = nodes.map((n) => n.numberOfLines).filter((n): n is number => typeof n === 'number');
    expect(Math.max(...limits)).toBeGreaterThanOrEqual(5);
  });

  it('keeps a cut-out word whole, cutting its letters a little smaller rather than across the word', async () => {
    // Its last scrap ran 4px off a 148dp card, and measured honestly it split as "Registeri / ng".
    for (const width of [148, 184.5]) {
      const post = makePost({
        id: 'chloe',
        cover_template: 'sketch_chloe',
        title: 'Registering your address in Berlin',
        body: 'Bring your passport and the rental contract.',
      });
      const tree = await render(<PostCover post={post} width={width} />);
      const scraps = findNode(tree.toJSON(), (st) => st.flexWrap === 'wrap' && st.alignItems === 'flex-end') as {
        children: unknown[];
      };
      expect(scraps).not.toBeNull();
      expect(sentence(scraps.children[0])).toBe('Registering');
    }
  });

  it('sets the sentence whole when the words before the phrase do not fit above it', async () => {
    // "Between it and your bank account sit income tax and fiv…" and then "insurances." on a line of its own.
    const post = makePost({ ...PAYSLIP, cover_template: 'crayon' });
    const plan = coverPlan(post, post.title, post.body);
    expect(plan.highlight).not.toBeNull();
    const texts = textNodes((await render(<PostCover post={post} width={184.5} />)).toJSON()).map((n) => n.text);
    expect(texts).toContain(plan.keyLine);
    expect(texts).not.toContain(plan.highlight!.span);
  });
});

describe('corner stickers', () => {
  it('gives up the corner sticker rather than draw it over a long summary', async () => {
    // lisum's Plaza, 2026-10-05: Sean's sparkle sat on "Schöneberg".
    const drawn = jest.spyOn(CoverStickerModule, 'CoverSticker');
    const u = 184.5 / 18;
    const cornerSizes = () =>
      drawn.mock.calls.map(([props]) => props.size).filter((size) => size > 2.5 * u);

    await render(
      <PostCover
        post={makePost({ id: 'sean-1', cover_template: 'sketch_sean', title: 'Short', body: 'One short line here.' })}
        width={184.5}
      />,
    );
    expect(cornerSizes().length).toBeGreaterThan(0);

    drawn.mockClear();
    await render(
      <PostCover
        post={makePost({
          id: 'sean-1',
          cover_template: 'sketch_sean',
          title: 'German for those rebuilding literacy skills',
          body:
            'If you have had schooling interrupted or never went far in school, this full-time course at ' +
            'Barbarossaplatz 5 in Schöneberg teaches reading and writing from the very first letter onwards.',
        })}
        width={184.5}
      />,
    );
    expect(cornerSizes()).toEqual([]);
    drawn.mockRestore();
  });
});

describe('cover defs', () => {
  it('gives every cover its own pattern ids, so a wall of cards does not share the first card\'s ground', async () => {
    // Ids live in one document on web: forty `url(#grid)` all resolved to the
    // first card's pattern, and every stamp card drew the journal stock's pale
    // green grid, bright on the black stock (2026-10-05, dev gallery).
    const ids: string[] = [];
    const refs: string[] = [];
    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const el = node as { props?: Record<string, unknown>; children?: unknown[] };
      if (el.props) {
        if (typeof el.props.id === 'string') ids.push(el.props.id);
        if (typeof el.props.fill === 'string' && el.props.fill.startsWith('url(#')) refs.push(el.props.fill.slice(5, -1));
      }
      (el.children ?? []).forEach(walk);
    };
    const result = await render(
      <>
        <PostCover post={makePost({ id: 'a1', cover_template: 'stamp', cover_palette: 3 })} width={160} />
        <PostCover post={makePost({ id: 'b2', cover_template: 'stamp', cover_palette: 0 })} width={160} />
        <PostCover post={makePost({ id: 'c3', cover_template: 'sketch_chloe' })} width={160} />
      </>,
    );
    const tree = result.toJSON();
    (Array.isArray(tree) ? tree : [tree]).forEach(walk);

    expect(ids.length).toBeGreaterThan(8);
    expect(new Set(ids).size).toBe(ids.length);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ids).toContain(ref);
  });
});
