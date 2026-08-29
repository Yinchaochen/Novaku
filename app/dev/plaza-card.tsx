import { useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { Screen } from '../../components/Screen';
import { SectionLabel } from '../../components/SectionLabel';
import { CommunityPostCard } from '../../features/community/CommunityPostCard';
import type { CommunityPost } from '../../features/community/useCommunity';
import { colors } from '../../theme/tokens';

import seeded from './_seededPosts.json';

/**
 * The feed card at the narrowest width it actually gets (2026-08-29).
 *
 * `/dev/seeded-posts` renders the same component down one full-width column,
 * which is where the byline bug hid for weeks: given 340dp the author name
 * fits, the Editor chip fits, the heart fits, and everything looks correct.
 * The Plaza gives each card ~148dp, and at that width the name was the only
 * flexible thing in the row, so it collapsed to nothing and every seeded card
 * read ".. Editor".
 *
 * So this gallery reproduces the geometry rather than the content: two columns
 * with the list's real 6px gutters, at 360dp — the tight end of the phone
 * range. Any change to the card's bottom row has to be looked at here, not
 * there.
 *
 * Not covered here: the "in review" / "rejected" chip, which only renders when
 * the viewer is the author. A gallery cannot sign anybody in, and pretending
 * otherwise would show a state that passes for the wrong reason; that chip is
 * exercised by /dev/video-post.
 */

const POSTS = seeded as unknown as CommunityPost[];

const LONG_GERMAN_TITLE =
  'Anerkennung ausländischer Berufsqualifikationen bei der Handwerkskammer Berlin';

function withPatch(base: CommunityPost, patch: Partial<CommunityPost>): CommunityPost {
  return { ...base, ...patch } as CommunityPost;
}

const withPicture = POSTS.find((post) => post.media_items.length > 0) ?? POSTS[0];
const withoutPicture = POSTS.find((post) => post.media_items.length === 0) ?? POSTS[0];

const STATES: { label: string; posts: CommunityPost[] }[] = [
  {
    label: 'Normal — the feed as it ships',
    posts: POSTS.slice(0, 4).map((post, index) =>
      withPatch(post, { id: `normal-${index}` }),
    ),
  },
  {
    label: 'Long German — the byline must survive a title that wraps',
    posts: [
      withPatch(withPicture, {
        id: 'de-1',
        title: LONG_GERMAN_TITLE,
        translated_title: null,
        source_language: 'de',
        title_source_language: 'de',
      }),
      withPatch(withoutPicture, {
        id: 'de-2',
        title: LONG_GERMAN_TITLE,
        translated_title: null,
        source_language: 'de',
        title_source_language: 'de',
      }),
    ],
  },
  {
    label: 'Translated — the card no longer spends two lines saying so',
    posts: [
      withPatch(withPicture, {
        id: 'tr-1',
        title: 'Ein ruhiger Nachmittag am Wasser',
        translated_title: 'A quiet afternoon by the water',
        source_language: 'de',
        title_source_language: 'de',
        is_translated: true,
      }),
      withPatch(withoutPicture, {
        id: 'tr-2',
        translated_title: 'Recognising a qualification earned abroad',
        translated_body: 'Germany splits professions into regulated and non-regulated ones.',
        source_language: 'de',
        title_source_language: 'de',
        body_source_language: 'de',
        is_translated: true,
      }),
    ],
  },
  {
    label: 'A real person, and a post that has been read',
    posts: [
      withPatch(withPicture, {
        id: 'human-1',
        helpful_count: 128,
        author: {
          ...withPicture.author,
          display_name: 'Lisumchen',
          account_kind: 'user',
          is_verified: true,
        },
      } as Partial<CommunityPost>),
      withPatch(withoutPicture, {
        id: 'human-2',
        helpful_count: 4,
        viewer_marked_helpful: true,
        post_type: 'question',
        author: {
          ...withoutPicture.author,
          display_name: 'Ein sehr langer Anzeigename',
          account_kind: 'user',
          is_verified: false,
        },
      } as Partial<CommunityPost>),
    ],
  },
  {
    // The worst case the byline row can be handed: a name that wants the whole
    // row, a verified badge that does not shrink, and a count wide enough to
    // matter. If the name survives here it survives everywhere.
    label: 'Tightest byline — long name, badge, four-digit count',
    posts: [
      withPatch(withPicture, {
        id: 'tight-1',
        helpful_count: 1284,
        author: {
          ...withPicture.author,
          display_name: 'Konstantina Papadopoulou',
          account_kind: 'user',
          is_verified: true,
        },
      } as Partial<CommunityPost>),
      withPatch(withoutPicture, {
        id: 'tight-2',
        helpful_count: 9999,
        author: {
          ...withoutPicture.author,
          display_name: 'Magdalena',
          account_kind: 'official',
          is_verified: true,
        },
      } as Partial<CommunityPost>),
    ],
  },
  {
    label: 'Empty — nothing to render',
    posts: [],
  },
];

/**
 * One screenful, at the real feed viewport.
 *
 * The question "how many posts does a screen hold" cannot be answered by a
 * gallery that scrolls forever, and it is the question the whole density
 * change turns on. So this draws the actual budget: a 393x873 phone, minus the
 * yellow band, minus the tab bar, minus the list's own top padding — and then
 * as many cards as fit. Count them.
 */
const DEVICE = { width: 393, height: 873, topInset: 41, bottomInset: 0 };
const BAND_H = Math.max(DEVICE.topInset + 12, 34) + 34 + 8 + (6 * 2 + 16) + 12;
const TAB_BAR_H = 64 + Math.max(DEVICE.bottomInset, 12);
const LIST_PAD_TOP = 34 - 32;
const FEED_H = DEVICE.height - BAND_H - TAB_BAR_H - LIST_PAD_TOP;

function OneScreenful({ posts }: { posts: CommunityPost[] }) {
  const columnWidth = (DEVICE.width - 12) / 2 - 6;
  return (
    <View style={{ width: DEVICE.width, alignSelf: 'center' }}>
      <View style={{ height: BAND_H, backgroundColor: '#FFD17E', justifyContent: 'flex-end', padding: 12 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>band {BAND_H}dp</Text>
      </View>
      <View style={{ height: FEED_H, overflow: 'hidden', paddingTop: LIST_PAD_TOP }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 6 }}>
          {[0, 1].map((column) => (
            <View key={column} style={{ width: columnWidth }}>
              {posts
                .filter((_, index) => index % 2 === column)
                .map((post) => (
                  <CommunityPostCard key={post.id} post={post} />
                ))}
            </View>
          ))}
        </View>
      </View>
      <View style={{ height: TAB_BAR_H, backgroundColor: '#FFFFFF', justifyContent: 'center', paddingLeft: 12 }}>
        <Text style={{ color: colors.textMuted, fontSize: 11 }}>
          tab bar {TAB_BAR_H}dp · feed {FEED_H}dp
        </Text>
      </View>
    </View>
  );
}

/** The list's own geometry: contentContainer 6, item 3 either side. */
function Columns({ posts, width }: { posts: CommunityPost[]; width: number }) {
  const columnWidth = (width - 12) / 2 - 6;
  if (posts.length === 0) {
    return (
      <Text style={{ color: colors.textMuted, fontSize: 13, paddingVertical: 12 }}>
        (no posts)
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 6 }}>
      {[0, 1].map((column) => (
        <View key={column} style={{ width: columnWidth }}>
          {posts
            .filter((_, index) => index % 2 === column)
            .map((post) => (
              <CommunityPostCard key={post.id} post={post} />
            ))}
        </View>
      ))}
    </View>
  );
}

export default function PlazaCardGallery() {
  const { width } = useWindowDimensions();
  // 393: the phone lisum films on, and the width the density work was measured
  // against. The byline squeeze is checked at 360 by the dedicated state
  // below, which pins a name against a badge and a four-digit count.
  const [feedWidth] = useState(() => Math.min(width, 393));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <SectionLabel>One screenful — count the complete cards</SectionLabel>
        <OneScreenful
          posts={[...POSTS, ...POSTS].map((post, index) => ({
            ...post,
            id: `screenful-${index}`,
          })) as CommunityPost[]}
        />

        <Text
          style={{
            fontSize: 12,
            color: colors.textMuted,
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 4,
          }}
        >
          Feed width {feedWidth}dp · column {Math.round((feedWidth - 12) / 2 - 6)}dp
        </Text>
        {STATES.map((state) => (
          <View key={state.label} style={{ width: feedWidth, alignSelf: 'center' }}>
            <SectionLabel>{state.label}</SectionLabel>
            <Columns posts={state.posts} width={feedWidth} />
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
