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
  return { __esModule: true, default: Stub, Svg: Stub, Circle: Stub, Defs: Stub, Line: Stub, Pattern: Stub, Rect: Stub };
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
  it('never sets a fontFamily, because the brand face has no CJK', async () => {
    const tree = await render(<PostCover post={makePost()} width={184.5} />);
    const styles = everyStyle(tree.toJSON());

    expect(styles.length).toBeGreaterThan(0);
    for (const style of styles) {
      expect(style?.fontFamily).toBeUndefined();
    }
  });

  it('prints a sentence from the body rather than the title', async () => {
    const tree = await render(<PostCover post={makePost()} width={184.5} />);

    expect(tree.getByText('For the city trip, remember that an ABC ticket is needed.')).toBeTruthy();
    expect(tree.queryByText('Getting from BER into the city')).toBeNull();
  });

  it('draws Chinese, which is what the server renderer could not do', async () => {
    const tree = await render(
      <PostCover
        post={makePost({ title: '从机场进城', body: '进城最快的是机场快线。记得买一张 ABC 区的票，否则会被罚款。' })}
        width={184.5}
      />,
    );

    expect(tree.getByText('记得买一张 ABC 区的票，否则会被罚款。')).toBeTruthy();
  });

  it('shows the rubric but no sentence when the body has nothing to lift', async () => {
    const tree = await render(<PostCover post={makePost({ title: 'Kurz', body: 'Ja.' })} width={184.5} />);

    expect(tree.getByText('Guide')).toBeTruthy();
    expect(tree.queryByText('Ja.')).toBeNull();
  });
});
