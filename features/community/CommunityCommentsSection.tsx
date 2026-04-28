import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import {
  CommunityPost,
  getCommunitySessionId,
  useCommunityComments,
  useCreateCommunityComment,
  useTrackCommunityEvents,
} from './useCommunity';

interface Props {
  post: CommunityPost;
  commentCount: number;
}

function formatCommentDate(value: string, langCode: string) {
  try {
    return new Intl.DateTimeFormat(langCode, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function CommunityCommentsSection({ post, commentCount }: Props) {
  const { t, langCode } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const comments = useCommunityComments(post.id, expanded);
  const createComment = useCreateCommunityComment(post.id);
  const { mutate: trackCommunityEvents } = useTrackCommunityEvents();

  const submitComment = () => {
    const trimmed = draft.trim();
    if (trimmed.length < 2) {
      return;
    }
    createComment.mutate(trimmed, {
      onSuccess: () => setDraft(''),
    });
  };

  return (
    <View className="mt-3 rounded-[22px] bg-surface px-3 py-3">
      <Pressable
        className="flex-row items-center justify-between"
        onPress={() => {
          setExpanded((value) => {
            const nextValue = !value;
            if (nextValue) {
              trackCommunityEvents([
                {
                  event_name: 'plaza_expand_comments',
                  session_id: getCommunitySessionId(),
                  surface: 'plaza_detail',
                  post_id: post.id,
                  feed_context: post.feed_context ?? undefined,
                  content_context: post.content_context ?? undefined,
                },
              ]);
            }
            return nextValue;
          });
        }}
      >
        <Text className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t.plaza.comments} · {commentCount}
        </Text>
        <Text className="text-xs font-semibold" style={{ color: '#FF2442' }}>
          {expanded ? t.plaza.comments_hide : t.plaza.comments_show}
        </Text>
      </Pressable>

      {expanded ? (
        <View className="mt-3">
          {comments.isLoading ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#FF2442" />
            </View>
          ) : comments.data?.length ? (
            <View className="gap-3">
              {comments.data.map((comment) => (
                <View key={comment.id} className="rounded-[20px] bg-white px-3 py-3">
                  <View className="mb-1 flex-row items-center justify-between gap-2">
                    <Text className="text-xs font-semibold" style={{ color: '#FF2442' }}>
                      {comment.author.display_name}
                    </Text>
                    <Text className="text-[11px] text-gray-400">
                      {formatCommentDate(comment.created_at, langCode)}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-600">{comment.body}</Text>
                  {comment.moderation_status !== 'approved' ? (
                    <Text className="mt-2 text-[11px] font-medium" style={{ color: '#FF9F0A' }}>
                      {t.plaza.moderation_review}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text className="py-3 text-sm text-gray-400">{t.plaza.comments_empty}</Text>
          )}

          <View className="mt-3 rounded-[20px] border border-gray-200 bg-white p-2">
            <TextInput
              className="min-h-[72px] px-2 py-2 text-sm"
              placeholder={t.plaza.comment_placeholder}
              multiline
              textAlignVertical="top"
              value={draft}
              onChangeText={setDraft}
            />
            <View className="mt-2 flex-row justify-end">
              <Pressable
                className="rounded-full px-4 py-2"
                style={{ backgroundColor: '#FF2442' }}
                onPress={submitComment}
                disabled={createComment.isPending}
              >
                {createComment.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-xs font-bold text-white">{t.plaza.comment_submit}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
