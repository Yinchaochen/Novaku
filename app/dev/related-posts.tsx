import { ScrollView, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { PageHeader } from '../../components/PageHeader';
import { CommunityPostCard } from '../../features/community/CommunityPostCard';
import { splitColumns } from '../../features/community/splitColumns';
import type { CommunityPost } from '../../features/community/useCommunity';
import { useLanguage } from '../../context/LanguageContext';
import { colors, spacing, typography } from '../../theme/tokens';

import seeded from './_seededPosts.json';

/**
 * The related-posts rail under a post's comments (D-097), state by state.
 *
 * The live section fetches its page and hides itself when there is nothing to
 * show, so the empty and loading states are deliberately invisible in the app.
 * A gallery cannot fake a fetch, but it can render the same presentational
 * shell (header + weighted two-column grid) that the section mounts, at the
 * modal's real px-5 width, plus explainers for the two nothing-states.
 */

const POSTS = seeded as unknown as CommunityPost[];

const LONG_GERMAN_TITLE =
  'Anerkennung ausländischer Berufsqualifikationen bei der Handwerkskammer Berlin';

function withPatch(base: CommunityPost, patch: Partial<CommunityPost>): CommunityPost {
  return { ...base, ...patch } as CommunityPost;
}

function Rail({ posts, title }: { posts: CommunityPost[]; title: string }) {
  const columns = splitColumns(posts);
  return (
    <View className="mt-2 border-t border-neutral-100 pt-6">
      <Text className="mb-4 text-[18px] font-semibold text-black">{title}</Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          {columns.left.map((post) => (
            <CommunityPostCard key={post.id} post={post} onPress={() => undefined} />
          ))}
        </View>
        <View className="flex-1">
          {columns.right.map((post) => (
            <CommunityPostCard key={post.id} post={post} onPress={() => undefined} />
          ))}
        </View>
      </View>
    </View>
  );
}

function StateHeading({ children }: { children: string }) {
  return (
    <Text style={[typography.bodyStrong, { color: colors.textMain, marginTop: spacing.xl }]}>
      {children}
    </Text>
  );
}

export default function RelatedPostsGallery() {
  const { t } = useLanguage();
  const six = POSTS.slice(0, 6).map((post, index) => withPatch(post, { id: `rail-${index}` }));
  const longGerman = [
    withPatch(POSTS[0], { id: 'de-0', title: LONG_GERMAN_TITLE, translated_title: null }),
    ...POSTS.slice(1, 4).map((post, index) => withPatch(post, { id: `de-${index + 1}` })),
  ];

  return (
    <Screen header={<PageHeader title="Related posts rail" subtitle="Normal · long German · empty · loading" />}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        <View className="px-5">
          <StateHeading>1. Normal — six posts, weighted two-column grid</StateHeading>
          <Rail posts={six} title={t.plaza.related_posts_title} />

          <StateHeading>2. Long German — header and a wrapping card title</StateHeading>
          <Rail posts={longGerman} title={t.plaza.related_posts_title} />

          <StateHeading>3. Empty — the section renders nothing</StateHeading>
          <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>
            No items means no header either: the live section returns null, so the
            detail page simply ends after the comments. There is no shell to show.
          </Text>

          <StateHeading>4. Loading — also nothing</StateHeading>
          <Text style={{ color: colors.textMuted, marginTop: spacing.sm }}>
            The rail sits below the fold; rendering a spinner there would shift
            layout for a section the reader has not reached yet. It appears when
            it has content, fully formed.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
