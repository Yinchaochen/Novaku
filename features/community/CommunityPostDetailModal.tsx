import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../../context/LanguageContext';
import { CommunityCommentsSection } from './CommunityCommentsSection';
import {
  CommunityPost,
  getCommunitySessionId,
  useAddActionToTasks,
  useMarkCommunityHelpful,
  useRefreshActionVerification,
  useTrackCommunityEvents,
} from './useCommunity';

interface Props {
  post: CommunityPost | null;
  visible: boolean;
  onClose: () => void;
  onHidePost?: (postId: string) => void;
  onReportPost?: (postId: string) => void;
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

function canRefreshVerification(status: string) {
  return status === 'source_attached' || status === 'stale' || status === 'community';
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <Image
        source={avatarUrl}
        contentFit="cover"
        style={{ width: 36, height: 36, borderRadius: 18 }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: 36, height: 36, backgroundColor: '#FFE6EA' }}
    >
      <Text style={{ color: '#FF2442', fontSize: 14, fontWeight: '700' }}>
        {name.trim().slice(0, 1).toUpperCase() || 'N'}
      </Text>
    </View>
  );
}

export function CommunityPostDetailModal({ post, visible, onClose, onHidePost, onReportPost }: Props) {
  const { t, langCode } = useLanguage();
  const insets = useSafeAreaInsets();
  const { mutate: trackCommunityEvents } = useTrackCommunityEvents();
  const helpful = useMarkCommunityHelpful();
  const addAction = useAddActionToTasks();
  const refreshAction = useRefreshActionVerification();
  const detailStartRef = useRef<number | null>(null);
  const detailKeyRef = useRef<string | null>(null);
  const hadDownstreamSignalRef = useRef(false);

  const postId = post?.id ?? null;
  const sourceHost = getSourceHost(post?.source_url);
  const postDate = formatDate(post?.created_at, langCode);
  const detailKey = post ? `${post.id}:${post.feed_context?.feed_request_id ?? 'standalone'}` : null;

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
  }, [detailKey, postId, trackCommunityEvents, visible]);

  if (!post) {
    return null;
  }

  const handleHidePost = () => {
    trackCommunityEvents([
      {
        event_name: 'plaza_hide_post',
        session_id: getCommunitySessionId(),
        surface: 'plaza_detail',
        post_id: post.id,
        feed_context: post.feed_context ?? undefined,
        content_context: post.content_context ?? undefined,
        metadata_json: { entry_point: 'detail' },
      },
    ]);
    onHidePost?.(post.id);
    onClose();
  };

  const handleReportPost = () => {
    Alert.alert(t.plaza.report_post, t.plaza.report_confirm_body, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        style: 'destructive',
        onPress: () => {
          trackCommunityEvents([
            {
              event_name: 'plaza_report_post',
              session_id: getCommunitySessionId(),
              surface: 'plaza_detail',
              post_id: post.id,
              feed_context: post.feed_context ?? undefined,
              content_context: post.content_context ?? undefined,
              metadata_json: { entry_point: 'detail' },
            },
          ]);
          onReportPost?.(post.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']} style={{ backgroundColor: '#F7F7F7' }}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable onPress={onClose}>
            <Ionicons name="chevron-back" size={24} color="#111111" />
          </Pressable>
          <Text className="text-base font-semibold text-black">{t.plaza.detail_title}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 16, 32) }}
        >
          {post.media_items.length > 0 ? (
            <View className="px-4">
              {post.media_items.map((media, index) => (
                <Image
                  key={media.id ?? `${media.media_url}-${index}`}
                  source={media.media_url}
                  contentFit="cover"
                  transition={120}
                  style={{ width: '100%', height: 360, borderRadius: 28, marginBottom: 12 }}
                />
              ))}
            </View>
          ) : null}

          <View className="px-4 pt-1">
            <Text className="mb-2 text-[24px] font-bold text-black">{post.title}</Text>
            <Text className="mb-4 text-[15px] leading-6 text-neutral-700">{post.body}</Text>

            <View className="mb-4 flex-row items-center gap-3">
              <Avatar name={post.author.display_name} avatarUrl={post.author.avatar_url} />
              <View className="flex-1">
                <Text className="font-semibold text-black">{post.author.display_name}</Text>
                <Text className="text-xs text-neutral-500">
                  {[post.city, postDate].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {sourceHost && post.source_url ? (
                <Pressable
                  className="rounded-full px-3 py-2"
                  style={{ backgroundColor: '#FFF1F3' }}
                  onPress={() => {
                    trackCommunityEvents([
                      {
                        event_name: 'plaza_open_source_link',
                        session_id: getCommunitySessionId(),
                        surface: 'plaza_detail',
                        post_id: post.id,
                        feed_context: post.feed_context ?? undefined,
                        content_context: post.content_context ?? undefined,
                        metadata_json: { source_host: sourceHost },
                      },
                    ]);
                    void Linking.openURL(post.source_url!);
                  }}
                >
                  <Text style={{ color: '#FF2442', fontSize: 12, fontWeight: '700' }}>{sourceHost}</Text>
                </Pressable>
              ) : null}
            </View>

            <View className="mb-4 flex-row gap-2">
              <Pressable className="rounded-full bg-neutral-100 px-4 py-2.5" onPress={handleHidePost}>
                <Text className="text-xs font-semibold text-black">{t.plaza.hide_post}</Text>
              </Pressable>
              <Pressable className="rounded-full bg-neutral-100 px-4 py-2.5" onPress={handleReportPost}>
                <Text className="text-xs font-semibold text-black">{t.plaza.report_post}</Text>
              </Pressable>
            </View>

            {post.extracted_summary ? (
              <View className="mb-4 rounded-[22px] px-4 py-3" style={{ backgroundColor: '#FFF1F3' }}>
                <Text style={{ color: '#C81E3A', fontSize: 13, fontWeight: '600' }}>
                  {post.extracted_summary}
                </Text>
              </View>
            ) : null}

            <View className="mb-5 flex-row flex-wrap gap-3">
              <Pressable
                className="flex-row items-center rounded-full px-4 py-3"
                style={{ backgroundColor: post.viewer_marked_helpful ? '#FFE6EA' : '#FFFFFF' }}
                onPress={() =>
                  helpful.mutate(post.id, {
                    onSuccess: () => {
                      hadDownstreamSignalRef.current = true;
                    },
                  })
                }
                disabled={post.viewer_marked_helpful || helpful.isPending}
              >
                {helpful.isPending ? (
                  <ActivityIndicator size="small" color="#FF2442" />
                ) : (
                  <>
                    <Ionicons
                      name={post.viewer_marked_helpful ? 'heart' : 'heart-outline'}
                      size={18}
                      color={post.viewer_marked_helpful ? '#FF2442' : '#111111'}
                    />
                    <Text className="ml-2 text-sm font-semibold text-black">{post.helpful_count}</Text>
                  </>
                )}
              </Pressable>

              <View className="flex-row items-center rounded-full bg-white px-4 py-3">
                <Ionicons name="chatbubble-outline" size={17} color="#111111" />
                <Text className="ml-2 text-sm font-semibold text-black">{post.comment_count}</Text>
              </View>

              <View className="flex-row items-center rounded-full bg-white px-4 py-3">
                <Ionicons name="checkmark-circle-outline" size={17} color="#111111" />
                <Text className="ml-2 text-sm font-semibold text-black">{post.action_task_count}</Text>
              </View>
            </View>

            {post.action_candidates.length > 0 ? (
              <View className="mb-5">
                <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {t.plaza.action_candidates}
                </Text>
                <View className="gap-3">
                  {post.action_candidates.map((candidate) => {
                    const verificationDate = formatDate(candidate.last_verified_at, langCode);
                    const nextVerifyDate = formatDate(candidate.next_verify_at, langCode);
                    const scorePercent = Math.round(candidate.reliability_score * 100);
                    const refreshingThis = refreshAction.isPending && refreshAction.variables === candidate.id;
                    const addingThis = addAction.isPending && addAction.variables === candidate.id;

                    return (
                      <View key={candidate.id} className="rounded-[24px] bg-white p-4">
                        <Text className="mb-1 text-[15px] font-semibold text-black">{candidate.title}</Text>
                        {candidate.description ? (
                          <Text className="mb-3 text-sm leading-5 text-neutral-600">{candidate.description}</Text>
                        ) : null}

                        <View className="mb-3 flex-row flex-wrap gap-2">
                          <View className="rounded-full bg-neutral-100 px-3 py-1.5">
                            <Text className="text-[11px] text-neutral-600">
                              {t.plaza[`verification_${candidate.verification_status}`]} · {scorePercent}%
                            </Text>
                          </View>
                          {verificationDate ? (
                            <View className="rounded-full bg-neutral-100 px-3 py-1.5">
                              <Text className="text-[11px] text-neutral-600">{verificationDate}</Text>
                            </View>
                          ) : null}
                          {nextVerifyDate ? (
                            <View className="rounded-full bg-neutral-100 px-3 py-1.5">
                              <Text className="text-[11px] text-neutral-600">
                                {t.plaza.verify_again} {nextVerifyDate}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View className="flex-row flex-wrap gap-2">
                          <Pressable
                            className="rounded-full px-4 py-3"
                            style={{ backgroundColor: '#FF2442' }}
                            disabled={addAction.isPending}
                            onPress={() =>
                              addAction.mutate(candidate.id, {
                                onSuccess: () => {
                                  hadDownstreamSignalRef.current = true;
                                },
                              })
                            }
                          >
                            {addingThis ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text className="text-sm font-semibold text-white">{t.plaza.add_to_tasks}</Text>
                            )}
                          </Pressable>

                          {canRefreshVerification(candidate.verification_status) ? (
                            <Pressable
                              className="rounded-full bg-neutral-100 px-4 py-3"
                              disabled={refreshAction.isPending}
                              onPress={() => refreshAction.mutate(candidate.id)}
                            >
                              {refreshingThis ? (
                                <ActivityIndicator size="small" color="#FF2442" />
                              ) : (
                                <Text className="text-sm font-semibold text-black">
                                  {t.plaza.refresh_verification}
                                </Text>
                              )}
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <CommunityCommentsSection post={post} commentCount={post.comment_count} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
