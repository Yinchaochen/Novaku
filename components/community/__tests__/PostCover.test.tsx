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
import type { CommunityPost } from '../../../features/community/useCommunity';

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  const Stub = (props: object) => <View {...props} />;
  // Every element the cover and its pack parts draw; a missing one renders as
  // `undefined` and fails on displayName rather than on the thing under test.
  const names = ['Svg', 'Circle', 'Defs', 'Line', 'Pattern', 'Rect', 'Path', 'Polygon', 'Polyline', 'Ellipse', 'G', 'RadialGradient', 'LinearGradient', 'Stop'];
  return { __esModule: true, default: Stub, ...Object.fromEntries(names.map((n) => [n, Stub])) };
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
    const tree = await render(<PostCover post={makePost()} width={184.5} />);
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
