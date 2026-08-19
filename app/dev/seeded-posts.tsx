import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { Screen } from '../../components/Screen';
import { SectionLabel } from '../../components/SectionLabel';
import { CommunityPostCard } from '../../features/community/CommunityPostCard';
import { CommunityPostDetailModal } from '../../features/community/CommunityPostDetailModal';
import type { CommunityPost } from '../../features/community/useCommunity';
import { colors } from '../../theme/tokens';

import seeded from './_seededPosts.json';

// The real seeded posts (D-065), exported from a run against a disposable
// test database and rendered through the production feed card — so what shows
// here is what a cold-start city's Plaza actually looks like, not a mockup.
//
// Three sources are mixed on purpose: the Odyssey task lines fill need-first,
// Wikivoyage fills adjacent exploration, kulturdaten fills the curiosity
// window with things happening this week. Seeing them in one column is the
// only way to judge whether the feed reads as one product.

const POSTS = seeded as unknown as CommunityPost[];

function Group({
  label,
  posts,
  onOpen,
}: {
  label: string;
  posts: CommunityPost[];
  onOpen: (post: CommunityPost) => void;
}) {
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      {posts.map((post) => (
        <CommunityPostCard key={post.id} post={post} onPress={onOpen} />
      ))}
    </>
  );
}

export default function SeededPostsGallery() {
  // Tapping a card must open the real detail modal, exactly as Plaza does:
  // a gallery where nothing opens cannot show whether the post reads well
  // once you are inside it.
  const [open, setOpen] = useState<CommunityPost | null>(null);

  // Split by what produced the post rather than by shape: the Odyssey posts
  // also carry place candidates once AI enrichment has run, so keying on
  // action_candidates silently moved them into the wrong group.
  const events = POSTS.filter((p) => p.language === 'de');
  const places = POSTS.filter((p) => p.language !== 'de' && !p.odyssey_slug);
  const tasks = POSTS.filter((p) => p.language !== 'de' && p.odyssey_slug);

  return (
    <Screen background="default" topInset>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMain }}>
          Seeded Plaza — real posts from the database
        </Text>
        <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textMuted }}>
          {POSTS.length} posts · {POSTS.filter((p) => p.media_items?.length).length} with a
          licensed photo · every one carries a source line
        </Text>

        <Group label={`1 · Odyssey tasks (${tasks.length})`} posts={tasks} onOpen={setOpen} />
        <Group label={`2 · Wikivoyage places (${places.length})`} posts={places} onOpen={setOpen} />
        <Group
          label={`3 · kulturdaten events, German (${events.length})`}
          posts={events}
          onOpen={setOpen}
        />
      </ScrollView>

      <CommunityPostDetailModal
        post={open}
        visible={open !== null}
        onClose={() => setOpen(null)}
      />
    </Screen>
  );
}
