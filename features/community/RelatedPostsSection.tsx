import { useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { CommunityPostCard } from './CommunityPostCard';
import { splitColumns } from './splitColumns';
import {
  getCommunitySessionId,
  useRelatedCommunityPosts,
  useTrackCommunityEvents,
  type CommunityPost,
} from './useCommunity';

type Props = {
  postId: string | null;
  enabled: boolean;
  onOpenPost: (post: CommunityPost) => void;
};

// The rail under a post's comments (D-086): one bounded page of need-adjacent
// posts. Empty, loading and error all render nothing — a section header with
// no content under it is a promise the data could not keep.
export function RelatedPostsSection({ postId, enabled, onOpenPost }: Props) {
  const { t } = useLanguage();
  const related = useRelatedCommunityPosts(postId, enabled);
  const { mutate: trackCommunityEvents } = useTrackCommunityEvents();
  // Rail renders count as plaza_card_visible, never plaza_impression: the
  // feed's fatigue and cold-start accounting filter by event name, and a post
  // rendered under someone's comments must not eat its feed hearings.
  const impressionKeysRef = useRef<Set<string>>(new Set());

  const items = useMemo(() => related.data?.items ?? [], [related.data]);
  const requestId = related.data?.related_request_id ?? null;

  useEffect(() => {
    if (!enabled || !requestId || items.length === 0) return;
    const events = items
      .filter((post) => !impressionKeysRef.current.has(`${requestId}:${post.id}`))
      .map((post) => {
        impressionKeysRef.current.add(`${requestId}:${post.id}`);
        return {
          event_name: 'plaza_card_visible' as const,
          session_id: getCommunitySessionId(),
          surface: 'plaza_related' as const,
          post_id: post.id,
          feed_context: post.feed_context ?? undefined,
          content_context: post.content_context ?? undefined,
        };
      });
    if (events.length > 0) {
      trackCommunityEvents(events);
    }
  }, [enabled, items, requestId, trackCommunityEvents]);

  if (!enabled || items.length === 0) {
    return null;
  }

  const columns = splitColumns(items);

  return (
    <View className="mt-8 border-t border-neutral-100 pt-6">
      <Text className="mb-4 text-[18px] font-semibold text-black">
        {t.plaza.related_posts_title}
      </Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          {columns.left.map((post) => (
            <CommunityPostCard key={post.id} post={post} onPress={onOpenPost} />
          ))}
        </View>
        <View className="flex-1">
          {columns.right.map((post) => (
            <CommunityPostCard key={post.id} post={post} onPress={onOpenPost} />
          ))}
        </View>
      </View>
    </View>
  );
}
