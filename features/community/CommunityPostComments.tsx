import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { resolveMediaUrl } from '../../lib/media';
import { useAuthStore } from '../../store/authStore';
import { ReportSheet } from '../../components/ReportSheet';
import {
  CommunityComment,
  CommunityPost,
  getCommunitySessionId,
  useCommunityComments,
  useCommunityCommentReplies,
  useDeleteComment,
  useMarkCommentHelpful,
  useTrackCommunityEvents,
  useUnmarkCommentHelpful,
} from './useCommunity';

interface Props {
  post: CommunityPost;
  /** Caller hands us the user's reply intent. Tapping "Reply" on a comment fires this. */
  onReplyToComment?: (comment: CommunityComment) => void;
  /** Caller hands us the user's edit intent. Tapping "Edit" on own comment fires this. */
  onEditComment?: (comment: CommunityComment) => void;
}

function formatCommentDate(value: string, langCode: string) {
  try {
    return new Intl.DateTimeFormat(langCode, { month: '2-digit', day: '2-digit' }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const resolvedAvatarUrl = resolveMediaUrl(avatarUrl);
  if (resolvedAvatarUrl) {
    return (
      <Image
        source={resolvedAvatarUrl}
        contentFit="cover"
        style={{ width: 38, height: 38, borderRadius: 19 }}
      />
    );
  }
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: 38, height: 38, backgroundColor: '#FFE6EA' }}
    >
      <Text style={{ color: '#F47C7C', fontSize: 14, fontWeight: '700' }}>
        {name.trim().slice(0, 1).toUpperCase() || 'N'}
      </Text>
    </View>
  );
}

export function CommunityPostComments({ post, onReplyToComment, onEditComment }: Props) {
  const { t, langCode } = useLanguage();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const comments = useCommunityComments(post.id, true);
  const { mutate: trackCommunityEvents } = useTrackCommunityEvents();

  const markHelpful = useMarkCommentHelpful(post.id);
  const unmarkHelpful = useUnmarkCommentHelpful(post.id);
  const deleteComment = useDeleteComment(post.id);

  const [translateOverrides, setTranslateOverrides] = useState<Record<string, boolean>>({});
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  const removeCommentFromCache = (commentId: string) => {
    qc.setQueriesData<CommunityComment[]>(
      { queryKey: ['community', 'comments', post.id] },
      (old) => (old ? old.filter((c) => c.id !== commentId) : old),
    );
    qc.setQueriesData<CommunityComment[]>(
      { queryKey: ['community', 'comments', post.id, 'replies'] },
      (old) => (old ? old.filter((c) => c.id !== commentId) : old),
    );
  };

  const handleOwnCommentMenu = (comment: CommunityComment) => {
    Alert.alert(t.plaza.more_actions_title, undefined, [
      {
        text: t.comments.edit,
        onPress: () => onEditComment?.(comment),
      },
      {
        text: t.comments.delete,
        style: 'destructive',
        onPress: () => {
          Alert.alert(t.comments.delete_confirm_title, t.comments.delete_confirm_body, [
            { text: t.common.cancel, style: 'cancel' },
            {
              text: t.comments.delete,
              style: 'destructive',
              onPress: () => deleteComment.mutate(comment.id),
            },
          ]);
        },
      },
      { text: t.common.cancel, style: 'cancel' },
    ]);
  };

  const handleReportOrHide = (comment: CommunityComment) => {
    Alert.alert(t.plaza.more_actions_title, undefined, [
      {
        text: t.plaza.hide_comment_action,
        onPress: () => {
          Alert.alert(t.plaza.hide_comment_title, t.plaza.hide_comment_confirm_body, [
            { text: t.common.cancel, style: 'cancel' },
            {
              text: t.plaza.hide_comment_action,
              style: 'destructive',
              onPress: () => {
                trackCommunityEvents([
                  {
                    event_name: 'plaza_report_comment',
                    session_id: getCommunitySessionId(),
                    surface: 'plaza_detail',
                    post_id: post.id,
                    comment_id: comment.id,
                    metadata_json: { kind: 'hide' },
                  },
                ]);
                removeCommentFromCache(comment.id);
              },
            },
          ]);
        },
      },
      {
        text: t.plaza.report_comment_action,
        style: 'destructive',
        onPress: () => {
          trackCommunityEvents([
            {
              event_name: 'plaza_report_comment',
              session_id: getCommunitySessionId(),
              surface: 'plaza_detail',
              post_id: post.id,
              comment_id: comment.id,
              metadata_json: { kind: 'report' },
            },
          ]);
          setReportingCommentId(comment.id);
        },
      },
      { text: t.common.cancel, style: 'cancel' },
    ]);
  };

  // Optimistic updates flip comment.viewer_marked_helpful in cache the moment
  // the tap fires, so we branch on the cached flag directly without waiting on
  // the in-flight request.
  const handleToggleHelpful = (comment: CommunityComment) => {
    if (comment.viewer_marked_helpful) {
      unmarkHelpful.mutate(comment.id);
    } else {
      markHelpful.mutate(comment.id);
    }
  };

  const toggleTranslate = (commentId: string) => {
    setTranslateOverrides((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const toggleThread = (commentId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  if (comments.isLoading) {
    return (
      <View className="py-8">
        <ActivityIndicator size="small" color="#F47C7C" />
      </View>
    );
  }

  if (!comments.data?.length) {
    return <Text className="pb-8 text-sm text-neutral-400">{t.plaza.comments_empty}</Text>;
  }

  return (
    <View>
      {comments.data.map((comment, index) => {
        const isOwn = Boolean(user?.id && comment.author.id === user.id);
        const isThreadOpen = expandedThreads.has(comment.id);
        return (
          <View
            key={comment.id}
            className={`${index === comments.data.length - 1 ? 'pb-2' : 'border-b border-neutral-100 pb-5'} pt-1`}
          >
            <CommentRow
              comment={comment}
              isOwn={isOwn}
              langCode={langCode}
              translateOverridden={translateOverrides[comment.id] ?? false}
              onPressReply={() => onReplyToComment?.(comment)}
              onPressHelpful={() => handleToggleHelpful(comment)}
              onPressTranslate={() => toggleTranslate(comment.id)}
              onPressMore={() =>
                isOwn ? handleOwnCommentMenu(comment) : handleReportOrHide(comment)
              }
            />

            {comment.reply_count > 0 ? (
              <View className="mt-2 ml-12">
                <Pressable onPress={() => toggleThread(comment.id)} hitSlop={6}>
                  <Text className="text-[12px] font-medium text-[#2F80ED]">
                    {isThreadOpen
                      ? t.comments.hide_replies
                      : t.comments.view_replies.replace('{count}', String(comment.reply_count))}
                  </Text>
                </Pressable>
                {isThreadOpen ? (
                  <RepliesList
                    postId={post.id}
                    parentCommentId={comment.id}
                    currentUserId={user?.id ?? null}
                    langCode={langCode}
                    onPressReply={(reply) => onReplyToComment?.(reply)}
                    onPressHelpful={(reply) => handleToggleHelpful(reply)}
                    onPressTranslate={(reply) => toggleTranslate(reply.id)}
                    translateOverrides={translateOverrides}
                    onPressMore={(reply) => {
                      const replyOwn = Boolean(user?.id && reply.author.id === user.id);
                      replyOwn ? handleOwnCommentMenu(reply) : handleReportOrHide(reply);
                    }}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      <ReportSheet
        visible={reportingCommentId !== null}
        contentType="comment"
        contentId={reportingCommentId}
        onClose={() => setReportingCommentId(null)}
      />
    </View>
  );
}

function RepliesList({
  postId,
  parentCommentId,
  currentUserId,
  langCode,
  translateOverrides,
  onPressReply,
  onPressHelpful,
  onPressTranslate,
  onPressMore,
}: {
  postId: string;
  parentCommentId: string;
  currentUserId: string | null;
  langCode: string;
  translateOverrides: Record<string, boolean>;
  onPressReply: (c: CommunityComment) => void;
  onPressHelpful: (c: CommunityComment) => void;
  onPressTranslate: (c: CommunityComment) => void;
  onPressMore: (c: CommunityComment) => void;
}) {
  const replies = useCommunityCommentReplies(postId, parentCommentId, true);
  if (replies.isLoading) {
    return (
      <View className="mt-2 py-3">
        <ActivityIndicator size="small" color="#F47C7C" />
      </View>
    );
  }
  if (!replies.data?.length) {
    return null;
  }
  return (
    <View className="mt-2">
      {replies.data.map((reply, index) => (
        <View key={reply.id} className={index === replies.data.length - 1 ? '' : 'mb-3'}>
          <CommentRow
            comment={reply}
            isOwn={Boolean(currentUserId && reply.author.id === currentUserId)}
            langCode={langCode}
            translateOverridden={translateOverrides[reply.id] ?? false}
            isReply
            onPressReply={() => onPressReply(reply)}
            onPressHelpful={() => onPressHelpful(reply)}
            onPressTranslate={() => onPressTranslate(reply)}
            onPressMore={() => onPressMore(reply)}
          />
        </View>
      ))}
    </View>
  );
}

function CommentRow({
  comment,
  isOwn,
  langCode,
  translateOverridden,
  isReply = false,
  onPressReply,
  onPressHelpful,
  onPressTranslate,
  onPressMore,
}: {
  comment: CommunityComment;
  isOwn: boolean;
  langCode: string;
  translateOverridden: boolean;
  isReply?: boolean;
  onPressReply: () => void;
  onPressHelpful: () => void;
  onPressTranslate: () => void;
  onPressMore: () => void;
}) {
  const { t } = useLanguage();
  const detailLine = [formatCommentDate(comment.created_at, langCode), comment.author.city]
    .filter(Boolean)
    .join(' · ');
  const showTranslated =
    Boolean(comment.translated_body) && comment.is_translated && !translateOverridden;
  const bodyToShow = showTranslated ? (comment.translated_body ?? comment.body) : comment.body;
  const replyPrefix = comment.reply_to_user_name ? (
    <>
      <Text className="text-[15px] font-semibold text-[#2F80ED]">
        {t.comments.reply_to_label.replace('{name}', comment.reply_to_user_name)}{': '}
      </Text>
    </>
  ) : null;

  // Tap avatar / display name → user profile. Self goes to the dedicated tab profile.
  const openAuthorProfile = () => {
    if (isOwn) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/users/${comment.author.id}` as never);
    }
  };

  return (
    <View className="flex-row gap-3">
      <Pressable onPress={openAuthorProfile} hitSlop={4}>
        <Avatar name={comment.author.display_name} avatarUrl={comment.author.avatar_url} />
      </Pressable>
      <View className="flex-1">
        <View className="flex-row items-start justify-between">
          <Pressable onPress={openAuthorProfile} hitSlop={4} className="flex-1">
            <Text className="text-[15px] font-semibold text-black" numberOfLines={1}>
              {comment.author.display_name}
            </Text>
          </Pressable>
          <Pressable onPress={onPressMore} hitSlop={8} className="ml-2">
            <Ionicons name="ellipsis-horizontal" size={16} color="#9CA3AF" />
          </Pressable>
        </View>

        <Text className="mt-1 text-[15px] leading-6 text-neutral-800">
          {replyPrefix}
          {bodyToShow}
        </Text>

        <View className="mt-2 flex-row flex-wrap items-center gap-3">
          <Text className="text-[12px] text-neutral-400">{detailLine}</Text>
          <Pressable onPress={onPressReply} hitSlop={6}>
            <Text className="text-[12px] font-medium text-neutral-500">{t.comments.reply}</Text>
          </Pressable>
          {comment.translated_body ? (
            <Pressable onPress={onPressTranslate} hitSlop={6}>
              <Text className="text-[12px] font-medium text-neutral-500">
                {showTranslated ? t.comments.show_original : t.comments.translate}
              </Text>
            </Pressable>
          ) : null}
          {comment.moderation_status !== 'approved' ? (
            <Text className="text-[12px] font-medium text-[#FF9F0A]">
              {t.plaza.moderation_review}
            </Text>
          ) : null}
        </View>

        <View className="mt-2 flex-row items-center gap-4">
          <Pressable onPress={onPressHelpful} hitSlop={6} className="flex-row items-center">
            <Ionicons
              name={comment.viewer_marked_helpful ? 'heart' : 'heart-outline'}
              size={16}
              color={comment.viewer_marked_helpful ? '#F47C7C' : '#9CA3AF'}
            />
            {comment.helpful_count > 0 ? (
              <Text className="ml-1 text-[12px] text-neutral-500">{comment.helpful_count}</Text>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
