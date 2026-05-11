import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../../context/LanguageContext';
import { formatDisplayLocation } from '../../lib/displayLocation';
import { resolveMediaUrl } from '../../lib/media';
import { useAuthStore } from '../../store/authStore';
import { ReportSheet } from '../../components/ReportSheet';
import { Toast, type ToastMessage } from '../../components/Toast';
import { CommentComposerSheet, type CommentComposerInput } from './CommentComposerSheet';
import { CommunityPostComments } from './CommunityPostComments';
import { TranslatedText } from './TranslatedText';
import {
  CommunityComment,
  CommunityFeedPage,
  CommunityPost,
  getCommunitySessionId,
  useAddActionToOdysseys,
  useCommunityPost,
  useCreateCommunityComment,
  useDeleteCommunityPost,
  useEditComment,
  useFollowUser,
  useMarkCommunityHelpful,
  useUnmarkCommunityHelpful,
  useSaveCommunityPost,
  useUnsaveCommunityPost,
  useRecordPostView,
  useTrackCommunityEvents,
  useUnfollowUser,
  useUpdatePostVisibility,
} from './useCommunity';

interface Props {
  post: CommunityPost | null;
  visible: boolean;
  onClose: () => void;
  onEditPost?: (post: CommunityPost) => void;
}

function getSourceHost(sourceUrl: string | null | undefined) {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return sourceUrl;
  }
}

function formatDate(value: string | null | undefined, langCode: string) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat(langCode, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

function Avatar({
  name,
  avatarUrl,
  size = 36,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const resolvedAvatarUrl = resolveMediaUrl(avatarUrl);

  if (resolvedAvatarUrl) {
    return (
      <Image
        source={resolvedAvatarUrl}
        contentFit="cover"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: '#FFE6EA' }}
    >
      <Text style={{ color: '#F67673', fontSize: Math.max(12, Math.floor(size * 0.38)), fontWeight: '700' }}>
        {name.trim().slice(0, 1).toUpperCase() || 'N'}
      </Text>
    </View>
  );
}

function metadataString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function firstMetadataString(...values: unknown[]) {
  for (const value of values) {
    const normalized = metadataString(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function getLocationEntries(post: CommunityPost) {
  const entries: Array<{
    key: string;
    label: string;
    meta: string | null;
    sourceUrl: string | null;
    actionCandidateId: string | null;
  }> = [];
  const seen = new Set<string>();

  for (const candidate of post.action_candidates) {
    const cardType = typeof candidate.metadata_json?.['card_type'] === 'string' ? candidate.metadata_json.card_type : null;
    if (
      candidate.action_type !== 'visit_place' &&
      candidate.action_type !== 'reserve_place' &&
      cardType !== 'place_visit' &&
      cardType !== 'booking'
    ) {
      continue;
    }

    const label = firstMetadataString(candidate.metadata_json?.['place_name'], candidate.entity_name);
    const sourceUrl = candidate.source_url ?? post.source_url ?? null;
    if (!label) {
      continue;
    }
    const dedupeKey = sourceUrl ?? label;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    entries.push({
      key: dedupeKey,
      label,
      meta: firstMetadataString(
        candidate.metadata_json?.['location_hint'],
        post.city,
        post.author.city,
        getSourceHost(sourceUrl),
      ),
      sourceUrl,
      actionCandidateId: candidate.id,
    });
  }

  if (entries.length > 0) {
    return entries;
  }

  if (post.source_url) {
    const fallbackLabel = firstMetadataString(post.city, post.author.city);
    if (fallbackLabel) {
      return [
        {
          key: post.source_url,
          label: fallbackLabel,
          meta: getSourceHost(post.source_url),
          sourceUrl: post.source_url,
          actionCandidateId: null,
        },
      ];
    }
  }

  return [];
}

export function CommunityPostDetailModal({ post: seedPost, visible, onClose, onEditPost }: Props) {
  const { t, langCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const user = useAuthStore((state) => state.user);
  const qc = useQueryClient();
  const { mutate: trackCommunityEvents } = useTrackCommunityEvents();
  const helpful = useMarkCommunityHelpful();
  const unhelpful = useUnmarkCommunityHelpful();
  const savePost = useSaveCommunityPost();
  const unsavePost = useUnsaveCommunityPost();
  const deletePost = useDeleteCommunityPost();
  const updateVisibility = useUpdatePostVisibility();
  const recordView = useRecordPostView();
  const addAction = useAddActionToOdysseys();
  const createComment = useCreateCommunityComment(seedPost?.id ?? '');
  const postDetail = useCommunityPost(seedPost?.id ?? null, visible && Boolean(seedPost?.id));
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [notesSettingsVisible, setNotesSettingsVisible] = useState(false);
  const [privacySheetVisible, setPrivacySheetVisible] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [replyTo, setReplyTo] = useState<{ commentId: string; userId: string; userName: string } | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<{ commentId: string; initialBody: string } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const editComment = useEditComment(seedPost?.id ?? '');
  const detailStartRef = useRef<number | null>(null);
  const detailKeyRef = useRef<string | null>(null);
  const hadDownstreamSignalRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const mediaScrollRef = useRef<ScrollView>(null);
  const commentsSectionYRef = useRef(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const post = postDetail.data ?? seedPost;
  const postId = post?.id ?? null;
  const locationEntries = post ? getLocationEntries(post) : [];
  const primarySourceUrl = locationEntries[0]?.sourceUrl ?? post?.source_url ?? null;
  const sourceHost = getSourceHost(primarySourceUrl);
  const postDate = formatDate(post?.created_at, langCode);
  const displayPostCity = formatDisplayLocation(post?.city);
  const displayAuthorCity = formatDisplayLocation(post?.author.city);
  const displayHeaderCity = displayPostCity ?? displayAuthorCity;
  const detailKey = post ? `${post.id}:${post.feed_context?.feed_request_id ?? 'standalone'}` : null;
  const mediaItemCount = post?.media_items.length ?? 0;
  const hasMediaPager = mediaItemCount > 1;
  const canEditPost = Boolean(user?.id && post?.author.id === user.id);

  useEffect(() => {
    if (!visible) {
      setActiveMediaIndex(0);
      scrollX.setValue(0);
      mediaScrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [scrollX, visible]);

  useEffect(() => {
    setActiveMediaIndex(0);
    scrollX.setValue(0);
    mediaScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [detailKey, scrollX]);

  useEffect(() => {
    if (!visible || !postId) return;
    recordView.mutate(postId);
  }, [visible, postId, recordView]);

  useEffect(() => {
    if (!visible || !post || !postId || !detailKey) {
      return;
    }
    if (detailKeyRef.current !== detailKey) {
      detailKeyRef.current = detailKey;
      detailStartRef.current = Date.now();
      hadDownstreamSignalRef.current = false;
      trackCommunityEvents([
        {
          event_name: 'plaza_open_post',
          session_id: getCommunitySessionId(),
          surface: 'plaza_detail',
          post_id: postId,
          feed_context: post.feed_context ?? undefined,
          content_context: post.content_context ?? undefined,
        },
      ]);
    }

    return () => {
      if (!detailStartRef.current) {
        return;
      }
      const dwellMs = Math.max(Date.now() - detailStartRef.current, 0);
      if (dwellMs > 0) {
        trackCommunityEvents([
          {
            event_name: 'plaza_dwell',
            session_id: getCommunitySessionId(),
            surface: 'plaza_detail',
            post_id: postId,
            feed_context: post.feed_context ?? undefined,
            content_context: post.content_context ?? undefined,
            dwell_ms: dwellMs,
            had_downstream_signal_in_session: hadDownstreamSignalRef.current,
          },
        ]);
      }
      detailStartRef.current = null;
      detailKeyRef.current = null;
      hadDownstreamSignalRef.current = false;
    };
  }, [detailKey, post, postId, trackCommunityEvents, visible]);

  if (!post) {
    return null;
  }

  const mediaHeight = Math.min(Math.round(viewportWidth * 1.02), 440);
  const dotSlot = 14;
  const inactiveDotSize = 6;
  const activeDotSize = 8;
  const dotTrackWidth = Math.max(post.media_items.length * dotSlot, activeDotSize);
  const activeDotTranslateX = hasMediaPager
    ? scrollX.interpolate({
        inputRange: post.media_items.map((_, index) => index * viewportWidth),
        outputRange: post.media_items.map(
          (_, index) => index * dotSlot + (dotSlot - activeDotSize) / 2,
        ),
        extrapolate: 'clamp',
      })
    : 0;

  const scrollToComments = () => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(commentsSectionYRef.current - 16, 0),
      animated: true,
    });
  };

  const handleEditPost = () => {
    onEditPost?.(post);
  };

  const handleDeletePost = () => {
    if (!post || deletePost.isPending) return;
    Alert.alert(
      t.plaza.delete_confirm_title,
      t.plaza.delete_confirm_body,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.plaza.delete_confirm_action,
          style: 'destructive',
          onPress: () => {
            deletePost.mutate(post.id, {
              onSuccess: () => {
                onClose();
              },
              onError: () => {
                Alert.alert(t.common.error, t.plaza.delete_failed);
              },
            });
          },
        },
      ],
    );
  };

  const handleOpenNotesSettings = () => {
    if (!canEditPost) return;
    setNotesSettingsVisible(true);
  };

  const handleNotesSettingsEdit = () => {
    setNotesSettingsVisible(false);
    handleEditPost();
  };

  const handleNotesSettingsDelete = () => {
    setNotesSettingsVisible(false);
    handleDeletePost();
  };

  const handleNotesSettingsComingSoon = (label: string) => {
    setNotesSettingsVisible(false);
    Alert.alert(label, t.plaza.coming_soon);
  };

  const removePostFromFeedCache = (postId: string) => {
    qc.setQueriesData<InfiniteData<CommunityFeedPage>>(
      { queryKey: ['community', 'feed'] },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== postId),
          })),
        };
      },
    );
  };

  const handleHidePost = () => {
    if (!post) return;
    Alert.alert(
      t.plaza.hide_post,
      t.plaza.hide_post_confirm_body,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.plaza.hide_post,
          style: 'destructive',
          onPress: () => {
            trackCommunityEvents([
              {
                event_name: 'plaza_hide_post',
                session_id: getCommunitySessionId(),
                surface: 'plaza_detail',
                post_id: post.id,
                feed_context: post.feed_context ?? undefined,
                content_context: post.content_context ?? undefined,
              },
            ]);
            removePostFromFeedCache(post.id);
            onClose();
          },
        },
      ],
    );
  };

  const handleReportPost = () => {
    if (!post) return;
    trackCommunityEvents([
      {
        event_name: 'plaza_report_post',
        session_id: getCommunitySessionId(),
        surface: 'plaza_detail',
        post_id: post.id,
        feed_context: post.feed_context ?? undefined,
        content_context: post.content_context ?? undefined,
      },
    ]);
    setReportSheetVisible(true);
  };

  const handleOpenMoreActions = () => {
    if (!post) return;
    Alert.alert(t.plaza.more_actions_title, undefined, [
      { text: t.plaza.hide_post, onPress: handleHidePost },
      { text: t.plaza.report_post, style: 'destructive', onPress: handleReportPost },
      { text: t.common.cancel, style: 'cancel' },
    ]);
  };

  const handleOpenSource = (targetUrl?: string | null, entryPoint: 'location_badge' | 'source_chip' = 'source_chip') => {
    const resolvedUrl = targetUrl ?? primarySourceUrl;
    const resolvedHost = getSourceHost(resolvedUrl);
    if (!resolvedUrl || !resolvedHost) {
      return;
    }
    trackCommunityEvents([
      {
        event_name: 'plaza_open_source_link',
        session_id: getCommunitySessionId(),
        surface: 'plaza_detail',
        post_id: post.id,
        feed_context: post.feed_context ?? undefined,
        content_context: post.content_context ?? undefined,
        metadata_json: { source_host: resolvedHost, entry_point: entryPoint },
      },
    ]);
    void Linking.openURL(resolvedUrl);
  };

  const handleSharePost = async () => {
    const message = [post.title, post.body, post.source_url].filter(Boolean).join('\n\n');
    if (!message) {
      return;
    }
    try {
      await Share.share({ message });
    } catch {
      // Ignore share cancellation/errors here; this is a convenience action.
    }
  };

  const handleAddLocationToTasks = (actionCandidateId: string) => {
    addAction.mutate(actionCandidateId, {
      onSuccess: () => {
        hadDownstreamSignalRef.current = true;
        showToast(t.plaza.add_to_odyssey_success, 2000);
      },
      onError: (err) => {
        const errBody = (err as { response?: { data?: { error?: { message?: string; code?: string } }; status?: number } })?.response;
        const code = errBody?.data?.error?.code;
        if (code === 'odyssey.already_active') {
          setToast({ id: Date.now(), tone: 'info', text: t.plaza.add_to_odyssey_already_active, durationMs: 2200 });
          return;
        }
        const detail = errBody?.data?.error?.message ?? (err as Error)?.message ?? '';
        Alert.alert(t.common.error, detail || t.plaza.add_to_tasks_failed);
      },
    });
  };

  const showToast = (text: string, durationMs?: number) => {
    setToast({ id: Date.now(), tone: 'success', text, durationMs });
  };

  const openCommentComposer = () => {
    setReplyTo(null);
    setComposerVisible(true);
  };

  const handleReplyToComment = (comment: CommunityComment) => {
    setEditTarget(null);
    setReplyTo({
      commentId: comment.parent_comment_id ?? comment.id,
      userId: comment.author.id,
      userName: comment.author.display_name,
    });
    setComposerVisible(true);
  };

  const handleEditComment = (comment: CommunityComment) => {
    setReplyTo(null);
    setEditTarget({ commentId: comment.id, initialBody: comment.body });
    setComposerVisible(true);
  };

  const handleComposerEditSubmit = (input: { commentId: string; body: string }) => {
    editComment.mutate(input, {
      onSuccess: () => {
        setComposerVisible(false);
        setEditTarget(null);
        showToast(t.comments.comment_updated, 1800);
      },
      onError: () => Alert.alert(t.common.error, t.common.error),
    });
  };

  const handleComposerSubmit = (input: CommentComposerInput) => {
    createComment.mutate(input, {
      onSuccess: (created) => {
        hadDownstreamSignalRef.current = true;
        const isReply = Boolean(created.parent_comment_id);
        setComposerVisible(false);
        setReplyTo(null);
        showToast(
          isReply ? t.comments.reply_posted : t.comments.comment_published,
          isReply ? 2000 : 3500,
        );
        if (!isReply) {
          // Scroll into the (now refreshed) comments section so the user sees their post.
          setTimeout(() => scrollToComments(), 80);
        }
      },
      onError: () => {
        Alert.alert(t.common.error, t.common.error);
      },
    });
  };

  // Optimistic updates flip post.author.viewer_is_following in cache the moment
  // the tap fires, so we branch on the cached flag without waiting on the
  // in-flight request.
  const handleToggleFollow = () => {
    if (!post) return;
    if (post.author.id === user?.id) return; // can't follow self
    if (post.author.viewer_is_following) {
      unfollowUser.mutate(post.author.id);
    } else {
      followUser.mutate(post.author.id);
    }
  };

  const handleMediaMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!hasMediaPager) {
      return;
    }
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / viewportWidth);
    const clampedIndex = Math.max(0, Math.min(post.media_items.length - 1, nextIndex));
    setActiveMediaIndex(clampedIndex);
  };

  const currentAvatarUrl = resolveMediaUrl(user?.avatar_url);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: '#FFF8F1' }}>
        <View className="px-4 pb-3 pt-2" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(98,57,40,0.06)' }}>
          <View className="flex-row items-center">
            <Pressable onPress={onClose} className="mr-3">
              <Ionicons name="chevron-back" size={26} color="#111111" />
            </Pressable>

            <View className="flex-1 flex-row items-center">
              <Avatar name={post.author.display_name} avatarUrl={post.author.avatar_url} size={34} />
              <View className="ml-3 flex-1">
                <Text numberOfLines={1} className="text-[15px] font-semibold text-black">
                  {post.author.display_name}
                </Text>
                {displayHeaderCity ? (
                  <Text numberOfLines={1} className="mt-0.5 text-[12px] text-neutral-400">
                    {displayHeaderCity}
                  </Text>
                ) : null}
              </View>
              {!canEditPost ? (
                <Pressable
                  onPress={handleToggleFollow}
                  className="ml-2 rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor: post.author.viewer_is_following ? '#F5F5F7' : '#F67673',
                  }}
                >
                  <Text
                    className="text-[12px] font-semibold"
                    style={{
                      color: post.author.viewer_is_following ? '#6B7280' : '#FFFFFF',
                    }}
                  >
                    {post.author.viewer_is_following ? t.comments.following : t.comments.follow}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View className="ml-3 flex-row items-center gap-3">
              <View className="rounded-full bg-[#FFE8DA] px-3 py-1.5">
                <Text className="text-[11px] font-bold text-[#F67673]">
                  {t.plaza[`type_${post.post_type}`]}
                </Text>
              </View>
              <Pressable onPress={handleSharePost}>
                <Ionicons name="share-social-outline" size={22} color="#111111" />
              </Pressable>
              {!canEditPost ? (
                <Pressable onPress={handleOpenMoreActions} hitSlop={6}>
                  <Ionicons name="ellipsis-horizontal" size={22} color="#111111" />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 168, 220) }}
            showsVerticalScrollIndicator={false}
          >
            {post.media_items.length > 0 ? (
              <View>
                <View style={{ width: viewportWidth, height: mediaHeight }} className="bg-[#F4F1EA]">
                  <Animated.ScrollView
                    ref={mediaScrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    decelerationRate="fast"
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                      { useNativeDriver: true },
                    )}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={handleMediaMomentumEnd}
                  >
                    {post.media_items.map((media, index) => (
                      <Image
                        key={media.id ?? `${media.media_url}-${index}`}
                        source={resolveMediaUrl(media.media_url) ?? media.media_url}
                        contentFit="cover"
                        transition={120}
                        style={{ width: viewportWidth, height: mediaHeight }}
                      />
                    ))}
                  </Animated.ScrollView>

                  {hasMediaPager ? (
                    <View
                      className="absolute right-4 top-4 rounded-full px-3 py-1.5"
                      style={{ backgroundColor: 'rgba(17, 17, 17, 0.72)' }}
                    >
                      <Text className="text-[14px] font-semibold text-white">
                        {activeMediaIndex + 1}/{post.media_items.length}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {hasMediaPager ? (
                  <View className="items-center bg-white pb-3 pt-3">
                    <View
                      className="relative"
                      style={{ width: dotTrackWidth, height: activeDotSize }}
                    >
                      {post.media_items.map((media, index) => (
                        <View
                          key={media.id ?? `dot-${index}`}
                          className="absolute rounded-full"
                          style={{
                            left: index * dotSlot + (dotSlot - inactiveDotSize) / 2,
                            top: (activeDotSize - inactiveDotSize) / 2,
                            width: inactiveDotSize,
                            height: inactiveDotSize,
                            backgroundColor: '#D1D5DB',
                          }}
                        />
                      ))}

                      <Animated.View
                        className="absolute rounded-full"
                        style={{
                          left: 0,
                          top: 0,
                          width: activeDotSize,
                          height: activeDotSize,
                          backgroundColor: '#4F64FF',
                          transform: [{ translateX: activeDotTranslateX }],
                        }}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View className="px-5 pb-6 pt-5">
              <TranslatedText
                originalText={post.title}
                translatedText={post.translated_title}
                sourceLanguage={post.source_language}
                textClassName="text-[21px] font-bold leading-8 text-black"
              />

              <TranslatedText
                originalText={post.body}
                translatedText={post.translated_body}
                sourceLanguage={post.source_language}
                textClassName="mt-4 text-[16px] leading-8 text-neutral-800"
              />

              {post.extracted_summary ? (
                <View className="mt-5 rounded-[20px] bg-[#FFF6F7] px-4 py-3">
                  <TranslatedText
                    originalText={post.extracted_summary}
                    translatedText={post.translated_extracted_summary}
                    sourceLanguage={post.source_language}
                    textStyle={{ color: '#C81E3A', fontSize: 13, fontWeight: '600', lineHeight: 18 }}
                  />
                </View>
              ) : null}

              {locationEntries.length > 0 ? (
                <View className="mt-5 gap-3">
                  {locationEntries.map((entry) => {
                    const displayLocationLabel = formatDisplayLocation(entry.label) ?? entry.label;
                    const displayLocationMeta = formatDisplayLocation(entry.meta) ?? entry.meta;
                    const addingThis =
                      Boolean(entry.actionCandidateId) &&
                      addAction.isPending &&
                      addAction.variables === entry.actionCandidateId;

                    return (
                      <View
                        key={entry.key}
                        className="rounded-[20px] border border-neutral-200 bg-white px-4 py-3"
                      >
                        <Pressable
                          className="flex-row items-center"
                          disabled={!entry.sourceUrl}
                          onPress={() => handleOpenSource(entry.sourceUrl, 'location_badge')}
                        >
                          <View
                            className="mr-3 items-center justify-center rounded-full"
                            style={{ width: 36, height: 36, backgroundColor: '#FFF1F3' }}
                          >
                            <Ionicons name="location-outline" size={18} color="#F47C7C" />
                          </View>

                          <View className="flex-1">
                            <Text numberOfLines={1} className="text-[15px] font-semibold text-black">
                              {displayLocationLabel}
                            </Text>
                            {displayLocationMeta ? (
                              <Text numberOfLines={1} className="mt-0.5 text-[12px] text-neutral-500">
                                {displayLocationMeta}
                              </Text>
                            ) : null}
                          </View>

                          {entry.sourceUrl ? (
                            <Ionicons name="chevron-forward" size={18} color="#B0B0B0" />
                          ) : null}
                        </Pressable>

                        {entry.actionCandidateId ? (
                          <View className="mt-3 border-t border-neutral-100 pt-3">
                            <Pressable
                              className="self-start rounded-full bg-[#F67673] px-4 py-2.5"
                              disabled={addAction.isPending}
                              onPress={() => handleAddLocationToTasks(entry.actionCandidateId!)}
                            >
                              {addingThis ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Text className="text-sm font-semibold text-white">
                                  {t.plaza.add_to_tasks}
                                </Text>
                              )}
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : sourceHost && primarySourceUrl ? (
                <Pressable
                  className="mt-5 self-start rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2.5"
                  onPress={() => handleOpenSource(primarySourceUrl, 'source_chip')}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="globe-outline" size={14} color="#6B7280" />
                    <Text className="ml-2 text-[12px] font-medium text-neutral-700">{sourceHost}</Text>
                  </View>
                </Pressable>
              ) : null}

              <View className="mt-4 flex-row flex-wrap items-center">
                {postDate ? <Text className="text-[12px] text-neutral-400">{postDate}</Text> : null}
                {postDate && post.city ? <Text className="px-1 text-[12px] text-neutral-300">·</Text> : null}
                {displayPostCity ? <Text className="text-[12px] text-neutral-400">{displayPostCity}</Text> : null}
              </View>


              <View
                className="mt-8 border-t border-neutral-100 pt-6"
                onLayout={(event) => {
                  commentsSectionYRef.current = event.nativeEvent.layout.y;
                }}
              >
                <View className="mb-5 flex-row items-center justify-between">
                  <Text className="text-[18px] font-semibold text-black">
                    {post.comment_count.toLocaleString(langCode)} {t.plaza.comments}
                  </Text>
                </View>

                <CommunityPostComments
                  post={post}
                  onReplyToComment={handleReplyToComment}
                  onEditComment={handleEditComment}
                />
              </View>
            </View>
          </ScrollView>

          <View className="border-t border-neutral-200 bg-white px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            {canEditPost ? (
              <Pressable
                onPress={handleOpenNotesSettings}
                className="mb-3 flex-row items-center justify-between rounded-2xl bg-[#F5F5F7] px-4 py-3"
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={post.visibility === 'private' ? 'lock-closed-outline' : 'lock-open-outline'}
                    size={18}
                    color="#111111"
                  />
                  <View className="ml-3">
                    <Text className="text-[13px] font-semibold text-black">
                      {post.visibility === 'private'
                        ? t.plaza.post_visibility_private
                        : t.plaza.post_visibility_public}
                    </Text>
                    <Text className="mt-0.5 text-[12px] text-neutral-500">
                      {t.plaza.post_edit_permissions_entry}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            ) : null}

            <View className="mb-3 flex-row items-center gap-3">
              <Avatar
                name={user?.display_name ?? 'N'}
                avatarUrl={currentAvatarUrl ?? user?.avatar_url}
                size={34}
              />

              <Pressable
                onPress={openCommentComposer}
                className="flex-1 flex-row items-center rounded-full bg-[#F5F5F7] px-4 py-3"
              >
                <Text className="flex-1 text-[14px] text-[#9CA3AF]">{t.comments.say_something}</Text>
                <Ionicons name="happy-outline" size={20} color="#9CA3AF" />
              </Pressable>
            </View>

            <View className="flex-row items-center justify-around">
              <Pressable
                className="flex-row items-center py-2"
                onPress={() => {
                  if (post.viewer_marked_helpful) {
                    unhelpful.mutate(post.id);
                  } else {
                    hadDownstreamSignalRef.current = true;
                    helpful.mutate(post.id);
                  }
                }}
              >
                <Ionicons
                  name={post.viewer_marked_helpful ? 'heart' : 'heart-outline'}
                  size={22}
                  color={post.viewer_marked_helpful ? '#F67673' : '#111111'}
                />
                <Text className="ml-2 text-[15px] font-medium text-black">{post.helpful_count}</Text>
              </Pressable>

              <Pressable
                className="flex-row items-center py-2"
                onPress={() => {
                  if (post.viewer_saved) {
                    unsavePost.mutate(post.id);
                  } else {
                    savePost.mutate(post.id);
                  }
                }}
              >
                <Ionicons
                  name={post.viewer_saved ? 'star' : 'star-outline'}
                  size={22}
                  color={post.viewer_saved ? '#F59E0B' : '#111111'}
                />
                <Text className="ml-2 text-[15px] font-medium text-black">{post.save_count}</Text>
              </Pressable>

              <Pressable className="flex-row items-center py-2" onPress={scrollToComments}>
                <Ionicons name="chatbubble-outline" size={21} color="#111111" />
                <Text className="ml-2 text-[15px] font-medium text-black">{post.comment_count}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <NotesSettingsSheet
        visible={notesSettingsVisible}
        onClose={() => setNotesSettingsVisible(false)}
        onEdit={handleNotesSettingsEdit}
        onPrivacy={() => {
          setNotesSettingsVisible(false);
          setPrivacySheetVisible(true);
        }}
        onBoost={() => handleNotesSettingsComingSoon(t.plaza.notes_action_boost)}
        onCollab={() => handleNotesSettingsComingSoon(t.plaza.notes_action_collab)}
        onDelete={handleNotesSettingsDelete}
        deletePending={deletePost.isPending}
      />

      <PrivacySheet
        visible={privacySheetVisible}
        currentVisibility={post.visibility ?? 'public'}
        onClose={() => setPrivacySheetVisible(false)}
        pending={updateVisibility.isPending}
        onSelect={(next) => {
          if (next === (post.visibility ?? 'public')) {
            setPrivacySheetVisible(false);
            return;
          }
          updateVisibility.mutate(
            { postId: post.id, visibility: next },
            {
              onSuccess: () => setPrivacySheetVisible(false),
              onError: () => Alert.alert(t.common.error, t.plaza.privacy_update_failed),
            },
          );
        }}
      />

      <CommentComposerSheet
        visible={composerVisible}
        pending={createComment.isPending || editComment.isPending}
        replyTo={replyTo}
        editTarget={editTarget}
        onClose={() => {
          setComposerVisible(false);
          setReplyTo(null);
          setEditTarget(null);
        }}
        onCancelReply={() => setReplyTo(null)}
        onSubmit={handleComposerSubmit}
        onSubmitEdit={handleComposerEditSubmit}
      />

      <Toast message={toast} onDismiss={() => setToast(null)} />

      <ReportSheet
        visible={reportSheetVisible}
        contentType="post"
        contentId={post?.id ?? null}
        onClose={() => setReportSheetVisible(false)}
      />
    </Modal>
  );
}

function NotesSettingsSheet({
  visible,
  onClose,
  onEdit,
  onPrivacy,
  onBoost,
  onCollab,
  onDelete,
  deletePending,
}: {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onPrivacy: () => void;
  onBoost: () => void;
  onCollab: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-3xl bg-white px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[16px] font-semibold text-black">
              {t.plaza.notes_settings_title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#111111" />
            </Pressable>
          </View>

          <View className="flex-row flex-wrap justify-between">
            <NotesSheetAction
              icon="create-outline"
              label={t.plaza.notes_action_edit}
              onPress={onEdit}
            />
            <NotesSheetAction
              icon="lock-closed-outline"
              label={t.plaza.notes_action_privacy}
              onPress={onPrivacy}
            />
            <NotesSheetAction
              icon="rocket-outline"
              label={t.plaza.notes_action_boost}
              onPress={onBoost}
            />
            <NotesSheetAction
              icon="people-outline"
              label={t.plaza.notes_action_collab}
              onPress={onCollab}
            />
            <NotesSheetAction
              icon="trash-outline"
              label={t.plaza.notes_action_delete}
              onPress={onDelete}
              danger
              loading={deletePending}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NotesSheetAction({
  icon,
  label,
  onPress,
  danger,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  loading?: boolean;
}) {
  const tint = danger ? '#F67673' : '#111111';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="mb-2 items-center"
      style={{ width: '18%' }}
    >
      <View
        className="mb-1 h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: danger ? '#FFF1F3' : '#F5F5F7' }}
      >
        {loading ? (
          <ActivityIndicator size="small" color={tint} />
        ) : (
          <Ionicons name={icon} size={22} color={tint} />
        )}
      </View>
      <Text
        numberOfLines={1}
        className="text-[11px] font-medium"
        style={{ color: tint }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PrivacySheet({
  visible,
  currentVisibility,
  onClose,
  onSelect,
  pending,
}: {
  visible: boolean;
  currentVisibility: 'public' | 'private';
  onClose: () => void;
  onSelect: (next: 'public' | 'private') => void;
  pending: boolean;
}) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-3xl bg-white px-5 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom + 16, 24) }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[16px] font-semibold text-black">
              {t.plaza.privacy_sheet_title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8} disabled={pending}>
              <Ionicons name="close" size={22} color="#111111" />
            </Pressable>
          </View>

          <PrivacyOption
            icon="globe-outline"
            label={t.plaza.privacy_public_label}
            hint={t.plaza.privacy_public_hint}
            selected={currentVisibility === 'public'}
            disabled={pending}
            onPress={() => onSelect('public')}
          />
          <View className="h-2" />
          <PrivacyOption
            icon="lock-closed-outline"
            label={t.plaza.privacy_private_label}
            hint={t.plaza.privacy_private_hint}
            selected={currentVisibility === 'private'}
            disabled={pending}
            onPress={() => onSelect('private')}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PrivacyOption({
  icon,
  label,
  hint,
  selected,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center rounded-2xl px-4 py-3"
      style={{
        backgroundColor: selected ? '#FFF1F3' : '#F5F5F7',
        borderWidth: selected ? 1 : 0,
        borderColor: selected ? '#F67673' : 'transparent',
      }}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: selected ? '#FFFFFF' : '#FFFFFF' }}
      >
        <Ionicons name={icon} size={20} color={selected ? '#F67673' : '#111111'} />
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-black">{label}</Text>
        <Text className="mt-0.5 text-[12px] text-neutral-500">{hint}</Text>
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={20} color="#F47C7C" />
      ) : (
        <View
          className="rounded-full"
          style={{ width: 18, height: 18, borderWidth: 1.5, borderColor: '#D1D5DB' }}
        />
      )}
    </Pressable>
  );
}
