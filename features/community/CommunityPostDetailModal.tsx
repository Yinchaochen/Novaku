import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { useLanguage } from '../../context/LanguageContext';
import { detailMediaHeight } from '../../lib/cardAspect';
import { formatDisplayLocation } from '../../lib/displayLocation';
import { normalizeMapUrl } from '../../lib/maps';
import { resolveMediaUrl } from '../../lib/media';
import { useAuthStore } from '../../store/authStore';
import { useBlockUser } from '../../features/social/useSocial';
import { ActionSheet, type ActionSheetAction } from '../../components/ActionSheet';
import { StoryShareCard } from '../../components/StoryShareCard';
import { ShareSheet } from '../../components/ShareSheet';
import { VideoFullscreenModal } from '../../components/community/VideoFullscreenModal';
import { ReportSheet } from '../../components/ReportSheet';
import { Toast, type ToastMessage } from '../../components/Toast';
import { CommentComposerSheet, type CommentComposerInput } from './CommentComposerSheet';
import { CommunityPostComments } from './CommunityPostComments';
import { CommunityPostImageViewer } from './CommunityPostImageViewer';
import { TranslatedText } from './TranslatedText';
import {
  CommunityComment,
  CommunityFeedPage,
  CommunityPost,
  getCommunitySessionId,
  isVideoMedia,
  useAddActionToOdysseys,
  useCommunityPost,
  useCreateCommunityComment,
  useDeleteCommunityPost,
  useEditComment,
  useFollowUser,
  useHidePost,
  useMarkCommunityHelpful,
  useUnmarkCommunityHelpful,
  useSaveCommunityPost,
  useUnsaveCommunityPost,
  useRecordPostView,
  useTrackCommunityEvents,
  useUnfollowUser,
  useUpdatePostVisibility,
} from './useCommunity';
import { OfficialChip, isOfficialAuthor } from '../../components/OfficialChip';
import { VerifiedBadge } from '../../components/VerifiedBadge';

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

function wrapMediaIndex(index: number, itemCount: number) {
  if (itemCount <= 0) return 0;
  return ((index % itemCount) + itemCount) % itemCount;
}

export function CommunityPostDetailModal({ post: seedPost, visible, onClose, onEditPost }: Props) {
  const { t, langCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  // Sized from the first picture once it loads. Event posters are mostly
  // words, and a fixed frame cut them off at both edges.
  const [measuredMediaHeight, setMeasuredMediaHeight] = useState<number | null>(null);
  const user = useAuthStore((state) => state.user);
  const qc = useQueryClient();
  const { mutate: trackCommunityEvents } = useTrackCommunityEvents();
  const hidePost = useHidePost();
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
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [privacySheetVisible, setPrivacySheetVisible] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [replyTo, setReplyTo] = useState<{ commentId: string; userId: string; userName: string } | null>(
    null,
  );
  const [editTarget, setEditTarget] = useState<{ commentId: string; initialBody: string } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [moreActionsVisible, setMoreActionsVisible] = useState(false);
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [videoPlayerUrl, setVideoPlayerUrl] = useState<string | null>(null);
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const editComment = useEditComment(seedPost?.id ?? '');
  const detailStartRef = useRef<number | null>(null);
  const detailKeyRef = useRef<string | null>(null);
  const hadDownstreamSignalRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const storyShotRef = useRef<ViewShot>(null);
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
  // Without the token (stale cache from an older API) the link still opens the
  // app / store landing — it just falls back to the generic chat preview (D-040).
  const postShareUrl = post
    ? `https://postervia.app/p/${post.id}${post.share_token ? `?s=${post.share_token}` : ''}`
    : '';
  const hasMediaPager = mediaItemCount > 1;
  const canEditPost = Boolean(user?.id && post?.author.id === user.id);
  const blockUser = useBlockUser();

  useEffect(() => {
    if (!visible) {
      setActiveMediaIndex(0);
      setLightboxVisible(false);
      scrollX.setValue(0);
      mediaScrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [scrollX, visible]);

  useEffect(() => {
    setActiveMediaIndex(0);
    scrollX.setValue(0);
    mediaScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [detailKey, scrollX]);

  const recordViewMutate = recordView.mutate;
  useEffect(() => {
    if (!visible || !postId) return;
    recordViewMutate(postId);
  }, [visible, postId, recordViewMutate]);

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

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (lightboxVisible) {
        setLightboxVisible(false);
        return true;
      }
      if (composerVisible) {
        setComposerVisible(false);
        setReplyTo(null);
        setEditTarget(null);
        return true;
      }
      if (privacySheetVisible) {
        setPrivacySheetVisible(false);
        return true;
      }
      if (reportSheetVisible) {
        setReportSheetVisible(false);
        return true;
      }
      if (moreActionsVisible) {
        setMoreActionsVisible(false);
        return true;
      }
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [composerVisible, lightboxVisible, moreActionsVisible, onClose, privacySheetVisible, reportSheetVisible, visible]);

  if (!post) {
    return null;
  }

  const mediaHeight = measuredMediaHeight ?? Math.min(Math.round(viewportWidth * 1.02), 440);
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
            // Real per-user hard filter — the row in user_hidden_posts keeps the
            // post out of this user's feed permanently across refresh / restart.
            hidePost.mutate(post.id);
            // Recommendation signal kept (feeds ranker / author trust score).
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

  const handleBlockAuthor = () => {
    if (!post) return;
    Alert.alert(t.chat.block_confirm_title, t.chat.block_confirm_message, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.chat.menu_block,
        style: 'destructive',
        onPress: () =>
          blockUser.mutate(
            { userId: post.author.id },
            {
              onSuccess: () => {
                // Instant removal from this viewer's feed (Apple 1.2); block also
                // writes an audit_log so the developer is notified.
                removePostFromFeedCache(post.id);
                onClose();
                Alert.alert(t.chat.blocked_toast);
              },
              onError: () => Alert.alert(t.common.error),
            },
          ),
      },
    ]);
  };

  const handleOpenMoreActions = () => {
    if (!post) return;
    setMoreActionsVisible(true);
  };

  const handleOpenSource = (
    targetUrl?: string | null,
    entryPoint: 'location_badge' | 'source_chip' = 'source_chip',
    fallbackQuery?: string | null,
  ) => {
    const rawUrl = targetUrl ?? primarySourceUrl;
    const finalUrl = normalizeMapUrl(rawUrl, fallbackQuery);
    const resolvedHost = getSourceHost(finalUrl);
    if (!finalUrl || !resolvedHost) {
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
    void Linking.openURL(finalUrl);
  };

  const captureShareCard = async () => (await storyShotRef.current?.capture?.()) ?? null;

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

  const commentErrorMessage = (err: unknown, scope: 'create' | 'edit'): string => {
    const errBody = (err as { response?: { data?: { error?: { code?: string; message?: string } }; status?: number } })?.response;
    const status = errBody?.status;
    const code = errBody?.data?.error?.code;
    const detail = errBody?.data?.error?.message;
    console.log(`[comment.${scope}] error`, { status, code, detail, raw: err });
    if (code === 'comment.moderation_rejected') return t.plaza.moderation_rejected_comment;
    if (status === undefined) return t.common.network_error;
    if (status >= 500) return t.common.server_error;
    return t.common.error;
  };

  const handleComposerEditSubmit = (input: { commentId: string; body: string }) => {
    editComment.mutate(input, {
      onSuccess: () => {
        setComposerVisible(false);
        setEditTarget(null);
        showToast(t.comments.comment_updated, 1800);
      },
      onError: (err) => Alert.alert(t.common.error, commentErrorMessage(err, 'edit')),
    });
  };

  const handleComposerSubmit = (input: CommentComposerInput) => {
    // MS-16: the mutation inserts an optimistic placeholder synchronously
    // (see useCreateCommunityComment), so close the composer and give
    // feedback right away instead of waiting on the network round-trip —
    // a flaky connection shouldn't hold the composer hostage. onError below
    // rolls the placeholder back and surfaces the failure.
    const isReply = Boolean(input.parent_comment_id);
    hadDownstreamSignalRef.current = true;
    setComposerVisible(false);
    setReplyTo(null);
    showToast(
      isReply ? t.comments.reply_posted : t.comments.comment_published,
      isReply ? 2000 : 3500,
    );
    if (!isReply) {
      // Scroll into the comments section so the user sees their (optimistic) post.
      setTimeout(() => scrollToComments(), 80);
    }
    createComment.mutate(input, {
      onError: (err) => Alert.alert(t.common.error, commentErrorMessage(err, 'create')),
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

  const goToMediaIndex = (index: number) => {
    if (!hasMediaPager) {
      return;
    }
    const nextIndex = wrapMediaIndex(index, mediaItemCount);
    const nextOffset = nextIndex * viewportWidth;
    setActiveMediaIndex(nextIndex);
    scrollX.setValue(nextOffset);
    mediaScrollRef.current?.scrollTo({ x: nextOffset, animated: true });
  };

  const currentAvatarUrl = resolveMediaUrl(user?.avatar_url);
  const postActions: ActionSheetAction[] = [
    { label: t.common.share, icon: 'share-social-outline', onPress: () => setShareSheetVisible(true) },
  ];

  if (canEditPost) {
    postActions.push(
      { label: t.plaza.notes_action_edit, icon: 'create-outline', onPress: handleEditPost },
      {
        label: t.plaza.notes_action_privacy,
        icon: post.visibility === 'private' ? 'lock-closed-outline' : 'lock-open-outline',
        onPress: () => setPrivacySheetVisible(true),
      },
      {
        label: t.plaza.notes_action_delete,
        icon: 'trash-outline',
        destructive: true,
        onPress: handleDeletePost,
      },
    );
  }

  // Hide / report / block are actions taken against *someone else's* content.
  // They never apply to your own post — for that you have edit / privacy /
  // delete above. Reporting your own post is meaningless, so guard the whole
  // set behind !canEditPost.
  if (!canEditPost) {
    postActions.push(
      { label: t.plaza.hide_post, icon: 'eye-off-outline', onPress: handleHidePost },
      { label: t.plaza.report_post, icon: 'flag-outline', destructive: true, onPress: handleReportPost },
      {
        label: t.chat.menu_block,
        icon: 'person-remove-outline',
        destructive: true,
        onPress: handleBlockAuthor,
      },
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {/* IOS-LOGIN-111: iOS Modal context doesn't propagate safe-area insets
          to SafeAreaView reliably; use outer insets directly. */}
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#FFF8F1' }}>
        <View className="px-4 pb-3 pt-2" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(98,57,40,0.06)' }}>
          <View className="flex-row items-center">
            <Pressable onPress={onClose} className="mr-3">
              <Ionicons name="chevron-back" size={26} color="#111111" />
            </Pressable>

            <View className="flex-1 flex-row items-center">
              <Avatar name={post.author.display_name} avatarUrl={post.author.avatar_url} size={34} />
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text numberOfLines={1} className="shrink text-[15px] font-semibold text-black">
                    {post.author.display_name}
                  </Text>
                  {post.author.is_verified ? <VerifiedBadge /> : null}
                  {isOfficialAuthor(post.author) ? <OfficialChip size="md" /> : null}
                </View>
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

            <View className="ml-2 flex-row items-center">
              <View className="rounded-full bg-[#FFE8DA] px-3 py-1.5">
                <Text className="text-[11px] font-bold text-[#F67673]">
                  {t.plaza[`type_${post.post_type}`]}
                </Text>
              </View>
              <Pressable
                onPress={handleOpenMoreActions}
                hitSlop={8}
                className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white"
                style={{ borderWidth: 1, borderColor: 'rgba(17,17,17,0.06)' }}
              >
                <Ionicons name="ellipsis-horizontal" size={22} color="#111111" />
              </Pressable>
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
            collapsable={false}
            nestedScrollEnabled
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
                    {post.media_items.map((media, index) => {
                      const isVideo = isVideoMedia(media);
                      return (
                        <Pressable
                          key={media.id ?? `${media.media_url}-${index}`}
                          onPress={() => {
                            if (isVideo) {
                              // §6.5: video URLs never fall back to the proxy;
                              // a broken public base means no playback.
                              const direct = resolveMediaUrl(media.media_url, { kind: 'video' });
                              if (direct) {
                                setVideoPlayerUrl(direct);
                              }
                              return;
                            }
                            setLightboxVisible(true);
                          }}
                          style={{ width: viewportWidth, height: mediaHeight }}
                          testID={isVideo ? 'post.detail.video' : undefined}
                        >
                          <Image
                            source={
                              resolveMediaUrl(isVideo ? media.thumb_url ?? media.media_url : media.media_url) ??
                              media.media_url
                            }
                            contentFit={isVideo ? 'cover' : 'contain'}
                            transition={120}
                            onLoad={(event) => {
                              if (isVideo || index !== 0) {
                                return;
                              }
                              const size = event?.source;
                              setMeasuredMediaHeight(
                                size
                                  ? detailMediaHeight(size.width, size.height, viewportWidth, viewportHeight)
                                  : null,
                              );
                            }}
                            style={{ width: viewportWidth, height: mediaHeight, backgroundColor: isVideo ? '#101010' : undefined }}
                          />
                          {isVideo ? (
                            <View
                              pointerEvents="none"
                              style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <View
                                style={{
                                  width: 64,
                                  height: 64,
                                  borderRadius: 32,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'rgba(0,0,0,0.38)',
                                }}
                              >
                                <Ionicons name="play" size={32} color="rgba(255,255,255,0.95)" />
                              </View>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
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

                  {hasMediaPager ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => goToMediaIndex(activeMediaIndex - 1)}
                        className="absolute items-center justify-center rounded-full"
                        style={{
                          left: 14,
                          top: mediaHeight / 2 - 22,
                          width: 44,
                          height: 44,
                          backgroundColor: 'rgba(17, 17, 17, 0.48)',
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.28)',
                        }}
                      >
                        <Ionicons name="chevron-back" size={25} color="#FFFFFF" />
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => goToMediaIndex(activeMediaIndex + 1)}
                        className="absolute items-center justify-center rounded-full"
                        style={{
                          right: 14,
                          top: mediaHeight / 2 - 22,
                          width: 44,
                          height: 44,
                          backgroundColor: 'rgba(17, 17, 17, 0.48)',
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.28)',
                        }}
                      >
                        <Ionicons name="chevron-forward" size={25} color="#FFFFFF" />
                      </Pressable>
                    </>
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
                sourceLanguage={post.title_source_language ?? post.source_language}
                textClassName="text-[21px] font-bold leading-8 text-black"
              />

              <TranslatedText
                originalText={post.body}
                translatedText={post.translated_body}
                sourceLanguage={post.body_source_language ?? post.source_language}
                textClassName="mt-4 text-[16px] leading-8 text-neutral-800"
                linkify
              />

              {post.extracted_summary ? (
                <View className="mt-5 rounded-[20px] bg-[#FFF6F7] px-4 py-3">
                  <TranslatedText
                    originalText={post.extracted_summary}
                    translatedText={post.translated_extracted_summary}
                    sourceLanguage={
                      post.extracted_summary_source_language ?? post.source_language
                    }
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
                          onPress={() => handleOpenSource(entry.sourceUrl, 'location_badge', entry.label)}
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
      </View>

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

      <ActionSheet
        visible={moreActionsVisible}
        title={t.plaza.more_actions_title}
        onClose={() => setMoreActionsVisible(false)}
        actions={postActions}
      />

      <CommunityPostImageViewer
        visible={lightboxVisible}
        mediaUrls={post.media_items.map(
          (media) => resolveMediaUrl(media.media_url) ?? media.media_url,
        )}
        activeIndex={activeMediaIndex}
        closeLabel={t.common.back}
        previousLabel={t.plaza.previous_image}
        nextLabel={t.plaza.next_image}
        onClose={() => setLightboxVisible(false)}
        onIndexChange={goToMediaIndex}
      />

      <View style={{ position: 'absolute', top: -10000, left: 0 }} pointerEvents="none">
        {post ? (
          <ViewShot ref={storyShotRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
            <StoryShareCard post={post} langCode={langCode} />
          </ViewShot>
        ) : null}
      </View>

      {post ? (
        <>
        <VideoFullscreenModal
          visible={videoPlayerUrl != null}
          sourceUrl={videoPlayerUrl}
          onClose={() => setVideoPlayerUrl(null)}
          actions={{
            helpfulCount: post.helpful_count,
            viewerMarkedHelpful: post.viewer_marked_helpful,
            onToggleHelpful: () => {
              if (post.viewer_marked_helpful) {
                unhelpful.mutate(post.id);
              } else {
                hadDownstreamSignalRef.current = true;
                helpful.mutate(post.id);
              }
            },
            commentCount: post.comment_count,
            onOpenComments: () => {
              // Comments live in the detail sheet below — close the player
              // and land the reader right on them.
              setVideoPlayerUrl(null);
              scrollToComments();
            },
            viewerSaved: Boolean(post.viewer_saved),
            onToggleSave: () => {
              if (post.viewer_saved) {
                unsavePost.mutate(post.id);
              } else {
                savePost.mutate(post.id);
              }
            },
            onShare: () => {
              setVideoPlayerUrl(null);
              setShareSheetVisible(true);
            },
          }}
        />
        <ShareSheet
          visible={shareSheetVisible}
          onClose={() => setShareSheetVisible(false)}
          capture={captureShareCard}
          linkUrl={postShareUrl}
          message={[post.title, postShareUrl].filter(Boolean).join('\n\n')}
          onCopied={() =>
            setToast({ id: Date.now(), tone: 'success', text: t.common.copied_to_clipboard, durationMs: 2500 })
          }
          onStoryLinkCopied={() =>
            setToast({ id: Date.now(), tone: 'success', text: t.plaza.share_link_copied, durationMs: 3000 })
          }
        />
        </>
      ) : null}
    </Modal>
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
