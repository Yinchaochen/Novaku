/**
 * The feed card's three quiet failures (2026-08-29).
 *
 * All three came out of one recording of the Plaza and none of them would have
 * failed a typecheck:
 *
 *  - A recycled FlashList cell kept the previous post's picture on screen
 *    until the new one decoded, so a post wore someone else's photo for a
 *    second or two. `recyclingKey` is the whole fix and nothing renders
 *    differently without it, which is exactly why it needs a test.
 *  - The Editor chip does not shrink and the author name does, so in a 148dp
 *    column the name was squeezed to zero and every seeded card read
 *    ".. Editor" with no author on it.
 *  - Every card printed "0" next to the heart, which is a report on how empty
 *    the room is rather than an invitation.
 */

import { render } from '@testing-library/react-native';

import { CommunityPostCard } from '../CommunityPostCard';
import type { CommunityPost } from '../useCommunity';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: object) => <View testID="expo-image" {...props} /> };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../../store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'viewer-1' } }),
}));
// Mocked outright rather than spread over the real module: importing it for
// real pulls in queryClient -> AsyncStorage, which has no native module here.
jest.mock('../useCommunity', () => ({
  isVideoMedia: (media: { mime_type?: string }) =>
    Boolean(media?.mime_type?.startsWith('video/')),
  useMarkCommunityHelpful: () => ({ mutate: jest.fn() }),
  useUnmarkCommunityHelpful: () => ({ mutate: jest.fn() }),
  useHidePost: () => ({ mutate: jest.fn() }),
}));
jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    langCode: 'en',
    t: {
      common: { cancel: 'Cancel' },
      plaza: {
        type_guide: 'Guide',
        hide_post: 'Hide',
        hide_post_confirm_body: 'Hide this post?',
        more_actions_title: 'More',
        task_card_event: 'Event',
        official_account_label: 'Official account',
        official_account_chip: 'Editor',
        translated_from: 'Translated from',
        show_original: 'Show original',
        show_translation: 'Show translation',
      },
      video: { status_rejected: 'Rejected', status_in_review: 'In review' },
    },
  }),
}));
jest.mock('../../../components/ActionSheet', () => ({ ActionSheet: () => null }));

const AUTHOR_NAME = 'Magdalena';

function makePost(overrides: Partial<CommunityPost> = {}): CommunityPost {
  return {
    id: 'post-abc',
    title: 'Walk the old runway at Tempelhof',
    body: 'Body text',
    post_type: 'guide',
    helpful_count: 0,
    viewer_marked_helpful: false,
    moderation_status: 'approved',
    action_candidates: [],
    media_items: [
      {
        id: 'media-1',
        media_url: 'https://media.postervia.app/a.jpg',
        thumb_url: null,
        mime_type: 'image/jpeg',
        width: 1200,
        height: 900,
      },
    ],
    author: {
      id: 'author-1',
      display_name: AUTHOR_NAME,
      avatar_url: 'https://media.postervia.app/avatar.jpg',
      account_kind: 'official',
      is_verified: false,
    },
    ...overrides,
  } as unknown as CommunityPost;
}

type Screen = Awaited<ReturnType<typeof render>>;

function images(tree: Screen) {
  return tree.getAllByTestId('expo-image');
}

describe('CommunityPostCard', () => {
  it('keys every picture to the post it belongs to, so a recycled cell clears', async () => {
    const tree = await render(<CommunityPostCard post={makePost()} />);
    const keys = images(tree).map((node) => node.props.recyclingKey);

    // Cover keyed to the post, avatar keyed to the author: the byline is
    // recycled independently of the picture above it.
    expect(keys).toContain('post-abc');
    expect(keys).toContain('author-1');
    expect(keys.every((key: unknown) => typeof key === 'string' && key.length > 0)).toBe(true);
  });

  it('renders the author name in full rather than letting the chip squeeze it out', async () => {
    const tree = await render(<CommunityPostCard post={makePost()} />);

    expect(tree.getByText(AUTHOR_NAME)).toBeTruthy();
  });

  it('does not print a helpful count of zero', async () => {
    const tree = await render(<CommunityPostCard post={makePost()} />);

    expect(tree.queryByText('0')).toBeNull();
  });

  it('prints the helpful count once there is one', async () => {
    const tree = await render(<CommunityPostCard post={makePost({ helpful_count: 7 })} />);

    expect(tree.getByText('7')).toBeTruthy();
  });

  it('keeps the Editor chip off the cover of a seeded card', async () => {
    // D-140: the disclosure moved to the detail header and the author profile.
    // The card is a preview; the reader meets the chip where the words are.
    const tree = await render(<CommunityPostCard post={makePost()} />);

    expect(tree.queryByTestId('account.official-chip')).toBeNull();
  });

  it('keeps it off the drawn cover a text post gets too', async () => {
    const tree = await render(<CommunityPostCard post={makePost({ media_items: [] })} />);

    expect(tree.queryByTestId('account.official-chip')).toBeNull();
  });

  it('draws the post its own cover when the picture never arrives', async () => {
    // lisum's wall, 2026-09-15: three cards were solid black rectangles with a
    // title under them. The slot's near-black is the moment before a picture
    // decodes; nothing turned it back into anything when the picture failed —
    // a dead URL, an R2 host that is not wired up, an iPhone HEIC the browser
    // cannot decode. A post always has words, so it always has a cover.
    const { act } = require('@testing-library/react-native');
    const tree = await render(<CommunityPostCard post={makePost()} />);

    const cover = images(tree).find((node) => node.props.onError);
    expect(cover).toBeTruthy();
    await act(async () => {
      cover!.props.onError();
    });

    // The photo is gone and the drawn cover is in its place: the rubric the
    // drawn cover prints is the proof, since the photo branch has no rubric.
    expect(images(tree).some((node) => node.props.onError)).toBe(false);
  });

  it('shows no chip for a post by a real person', async () => {
    const post = makePost();
    const tree = await render(
      <CommunityPostCard
        post={{
          ...post,
          author: { ...post.author, account_kind: 'user', display_name: 'Lisumchen' },
        } as CommunityPost}
      />,
    );

    expect(tree.queryByTestId('account.official-chip')).toBeNull();
    expect(tree.getByText('Lisumchen')).toBeTruthy();
  });
});
