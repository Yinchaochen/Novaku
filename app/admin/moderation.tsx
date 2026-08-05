import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { SettingsHeader } from '../../components/SettingsRow';
import { VideoFullscreenModal } from '../../components/community/VideoFullscreenModal';
import { useLanguage } from '../../context/LanguageContext';
import { resolveMediaUrl } from '../../lib/media';
import {
  useAdminContentReports,
  useAdminFlaggedPosts,
  useAdminVideoReviewPosts,
  useResolveContentReport,
  useUpdatePostModeration,
} from '../../features/admin/useAdminModeration';

type ModerationTab = 'reports' | 'flagged' | 'videos';

export default function AdminModerationScreen() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ModerationTab>('reports');
  const [reviewPlayerUrl, setReviewPlayerUrl] = useState<string | null>(null);

  // Queries
  const { data: reports, isLoading: isReportsLoading } = useAdminContentReports('pending');
  const { data: flaggedPosts, isLoading: isFlaggedLoading } = useAdminFlaggedPosts();
  const { data: videoReviewPosts, isLoading: isVideoLoading } = useAdminVideoReviewPosts();

  // Mutations
  const resolveReport = useResolveContentReport();
  const updatePost = useUpdatePostModeration();

  const handleResolveReport = (reportId: string, action: 'action_taken' | 'no_action' | 'invalid') => {
    const isRemove = action === 'action_taken';
    const alertTitle = isRemove
      ? t.admin.moderation_confirm_remove_title
      : t.common.confirm;
    const alertBody = isRemove
      ? t.admin.moderation_confirm_remove_body
      : t.common.confirm; // Fallback or standard confirmation message

    Alert.alert(alertTitle, alertBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        style: isRemove ? 'destructive' : 'default',
        onPress: () => {
          resolveReport.mutate(
            { reportId, action },
            {
              onSuccess: () => {
                Alert.alert(t.admin.moderation_title, t.admin.moderation_toast_resolved);
              },
              onError: () => {
                Alert.alert(t.admin.moderation_title, t.common.error);
              },
            }
          );
        },
      },
    ]);
  };

  const handleUpdatePostStatus = (postId: string, moderationStatus: 'approved' | 'rejected') => {
    const isApprove = moderationStatus === 'approved';
    const alertTitle = isApprove
      ? t.admin.moderation_action_approve
      : t.admin.moderation_action_reject;
    const alertBody = isApprove
      ? 'Approve this post and make it visible on the feed?'
      : 'Reject this post and hide it from all feeds?';

    Alert.alert(alertTitle, alertBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        style: isApprove ? 'default' : 'destructive',
        onPress: () => {
          updatePost.mutate(
            { postId, moderationStatus },
            {
              onSuccess: () => {
                Alert.alert(t.admin.moderation_title, t.admin.moderation_toast_resolved);
              },
              onError: () => {
                Alert.alert(t.admin.moderation_title, t.common.error);
              },
            }
          );
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.admin.moderation_title} onBack={() => router.back()} />

      {/* Tabs */}
      <View className="flex-row border-b border-neutral-200 bg-white px-4">
        <Pressable
          onPress={() => setActiveTab('reports')}
          className="flex-1 items-center py-3 border-b-2"
          style={{ borderBottomColor: activeTab === 'reports' ? '#FF9F6E' : 'transparent' }}
        >
          <Text
            className="text-[14px] font-bold"
            style={{ color: activeTab === 'reports' ? '#FF9F6E' : '#6B7280' }}
          >
            {t.admin.moderation_tab_reports} ({reports?.length ?? 0})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('flagged')}
          className="flex-1 items-center py-3 border-b-2"
          style={{ borderBottomColor: activeTab === 'flagged' ? '#FF9F6E' : 'transparent' }}
        >
          <Text
            className="text-[14px] font-bold"
            style={{ color: activeTab === 'flagged' ? '#FF9F6E' : '#6B7280' }}
          >
            {t.admin.moderation_tab_flagged} ({flaggedPosts?.length ?? 0})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('videos')}
          className="flex-1 items-center py-3 border-b-2"
          style={{ borderBottomColor: activeTab === 'videos' ? '#FF9F6E' : 'transparent' }}
          testID="admin.moderation.tab.videos"
        >
          <Text
            className="text-[14px] font-bold"
            style={{ color: activeTab === 'videos' ? '#FF9F6E' : '#6B7280' }}
          >
            {t.admin.moderation_tab_videos} ({videoReviewPosts?.length ?? 0})
          </Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-12 px-4 pt-4 gap-4">
        {activeTab === 'videos' ? (
          isVideoLoading ? (
            <ActivityIndicator color="#FF9F6E" className="mt-8" />
          ) : !videoReviewPosts || videoReviewPosts.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="checkmark-circle-outline" size={48} color="#FF9F6E" />
              <Text className="text-center text-neutral-500 mt-4 text-[15px]">
                {t.admin.moderation_empty_videos}
              </Text>
            </View>
          ) : (
            videoReviewPosts.map((post) => {
              const video = post.media_items.find((item) => (item.mime_type ?? '').startsWith('video/'));
              const directUrl = video ? resolveMediaUrl(video.media_url, { kind: 'video' }) : null;
              return (
                <View key={post.id} className="rounded-2xl bg-white p-4 border border-neutral-100 shadow-sm">
                  <View className="flex-row items-center justify-between border-b border-neutral-100 pb-2 mb-3">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="videocam-outline" size={16} color="#FF9F6E" />
                      <Text className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wider">
                        {t.admin.moderation_video_label}
                      </Text>
                    </View>
                    <Text className="text-[11px] text-neutral-400">
                      {new Date(post.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  <Pressable
                    disabled={!directUrl}
                    onPress={() => directUrl && setReviewPlayerUrl(directUrl)}
                    className="mb-3 overflow-hidden rounded-xl"
                    testID={`admin.video.play.${post.id}`}
                  >
                    <Image
                      source={resolveMediaUrl(video?.thumb_url) ?? video?.thumb_url ?? undefined}
                      contentFit="cover"
                      style={{ width: '100%', height: 170, backgroundColor: '#101010' }}
                    />
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
                      <Ionicons name="play-circle" size={44} color="rgba(255,255,255,0.92)" />
                    </View>
                  </Pressable>

                  <View className="border border-neutral-100 rounded-xl p-3 mb-4 bg-neutral-50">
                    <Text className="text-[12px] font-semibold text-neutral-600 mb-1">
                      @{post.author.display_name}
                    </Text>
                    <Text className="text-[14px] font-bold text-neutral-800 mb-1">{post.title}</Text>
                    {post.body ? (
                      <Text className="text-[13px] text-neutral-700 leading-5" numberOfLines={4}>
                        {post.body}
                      </Text>
                    ) : null}
                  </View>

                  <View className="flex-row gap-2">
                    <Pressable
                      disabled={updatePost.isPending}
                      onPress={() => handleUpdatePostStatus(post.id, 'approved')}
                      className="flex-1 rounded-xl bg-emerald-600 py-2.5 items-center justify-center"
                      style={{ opacity: updatePost.isPending ? 0.6 : 1 }}
                    >
                      <Text className="text-white text-[13px] font-bold">
                        {t.admin.moderation_action_approve}
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={updatePost.isPending}
                      onPress={() => handleUpdatePostStatus(post.id, 'rejected')}
                      className="flex-1 rounded-xl bg-red-500 py-2.5 items-center justify-center"
                      style={{ opacity: updatePost.isPending ? 0.6 : 1 }}
                    >
                      <Text className="text-white text-[13px] font-bold">
                        {t.admin.moderation_action_reject}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )
        ) : activeTab === 'reports' ? (
          isReportsLoading ? (
            <ActivityIndicator color="#FF9F6E" className="mt-8" />
          ) : !reports || reports.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="checkmark-circle-outline" size={48} color="#FF9F6E" />
              <Text className="text-center text-neutral-500 mt-4 text-[15px]">
                {t.admin.moderation_empty_reports}
              </Text>
            </View>
          ) : (
            reports.map((report) => (
              <View key={report.id} className="rounded-2xl bg-white p-4 border border-neutral-100 shadow-sm">
                {/* Header info */}
                <View className="flex-row items-center justify-between border-b border-neutral-100 pb-2 mb-3">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons
                      name={
                        report.content_type === 'post'
                          ? 'document-text-outline'
                          : report.content_type === 'comment'
                          ? 'chatbubble-outline'
                          : 'person-outline'
                      }
                      size={16}
                      color="#6B7280"
                    />
                    <Text className="text-[12px] font-semibold text-neutral-500 capitalize">
                      {t.admin.moderation_report_type.replace('{type}', report.content_type)}
                    </Text>
                  </View>
                  <Text className="text-[11px] text-neutral-400">
                    {new Date(report.reported_at).toLocaleDateString()}
                  </Text>
                </View>

                {/* Reason Details */}
                <View className="bg-neutral-50 rounded-xl p-3 mb-3 gap-1">
                  <Text className="text-[13px] font-bold text-neutral-700">
                    {t.admin.moderation_reason.replace(
                      '{reason}',
                      t.report.reasons[report.reason_category as keyof typeof t.report.reasons] ||
                        report.reason_category
                    )}
                  </Text>
                  {report.reason_description ? (
                    <Text className="text-[13px] text-neutral-600 mt-1">
                      {t.admin.moderation_description}: {report.reason_description}
                    </Text>
                  ) : null}
                  <Text className="text-[11px] text-neutral-400 mt-1">
                    {t.admin.moderation_reporter.replace('{reporter}', report.reporter_email || 'anonymous')}
                  </Text>
                </View>

                {/* Preview Content */}
                {report.target ? (
                  <View className="border border-neutral-100 rounded-xl p-3 mb-4 bg-white">
                    <Text className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Content Preview
                    </Text>
                    {report.target.author_name ? (
                      <Text className="text-[12px] font-semibold text-neutral-600 mb-1">
                        @{report.target.author_name}
                      </Text>
                    ) : null}
                    {report.target.title ? (
                      <Text className="text-[14px] font-bold text-neutral-800 mb-1">
                        {report.target.title}
                      </Text>
                    ) : null}
                    {report.target.body ? (
                      <Text className="text-[13px] text-neutral-700 leading-5">
                        {report.target.body}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text className="text-[12px] text-neutral-400 italic mb-4">Content unavailable (deleted)</Text>
                )}

                {/* Action Buttons */}
                <View className="flex-row gap-2">
                  <Pressable
                    disabled={resolveReport.isPending}
                    onPress={() => handleResolveReport(report.id, 'action_taken')}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 items-center justify-center"
                    style={{ opacity: resolveReport.isPending ? 0.6 : 1 }}
                  >
                    <Text className="text-white text-[13px] font-bold">
                      {t.admin.moderation_action_remove}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={resolveReport.isPending}
                    onPress={() => handleResolveReport(report.id, 'no_action')}
                    className="flex-1 rounded-xl bg-neutral-200 py-2.5 items-center justify-center"
                    style={{ opacity: resolveReport.isPending ? 0.6 : 1 }}
                  >
                    <Text className="text-neutral-700 text-[13px] font-bold">
                      {t.admin.moderation_action_dismiss}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )
        ) : (
          isFlaggedLoading ? (
            <ActivityIndicator color="#FF9F6E" className="mt-8" />
          ) : !flaggedPosts || flaggedPosts.length === 0 ? (
            <View className="items-center justify-center py-12">
              <Ionicons name="checkmark-circle-outline" size={48} color="#FF9F6E" />
              <Text className="text-center text-neutral-500 mt-4 text-[15px]">
                {t.admin.moderation_empty_flagged}
              </Text>
            </View>
          ) : (
            flaggedPosts.map((post) => (
              <View key={post.id} className="rounded-2xl bg-white p-4 border border-neutral-100 shadow-sm">
                {/* Header info */}
                <View className="flex-row items-center justify-between border-b border-neutral-100 pb-2 mb-3">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="alert-circle-outline" size={16} color="#FF9F6E" />
                    <Text className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Flagged Post ({post.post_type})
                    </Text>
                  </View>
                  <Text className="text-[11px] text-neutral-400">
                    {new Date(post.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {/* Post Body preview */}
                <View className="border border-neutral-100 rounded-xl p-3 mb-4 bg-neutral-50">
                  <Text className="text-[12px] font-semibold text-neutral-600 mb-1">
                    @{post.author.display_name}
                  </Text>
                  {post.title ? (
                    <Text className="text-[14px] font-bold text-neutral-800 mb-1">
                      {post.title}
                    </Text>
                  ) : null}
                  {post.body ? (
                    <Text className="text-[13px] text-neutral-700 leading-5">
                      {post.body}
                    </Text>
                  ) : null}
                </View>

                {/* Actions */}
                <View className="flex-row gap-2">
                  <Pressable
                    disabled={updatePost.isPending}
                    onPress={() => handleUpdatePostStatus(post.id, 'approved')}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 items-center justify-center"
                    style={{ opacity: updatePost.isPending ? 0.6 : 1 }}
                  >
                    <Text className="text-white text-[13px] font-bold">
                      {t.admin.moderation_action_approve}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={updatePost.isPending}
                    onPress={() => handleUpdatePostStatus(post.id, 'rejected')}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 items-center justify-center"
                    style={{ opacity: updatePost.isPending ? 0.6 : 1 }}
                  >
                    <Text className="text-white text-[13px] font-bold">
                      {t.admin.moderation_action_reject}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      <VideoFullscreenModal
        visible={reviewPlayerUrl != null}
        sourceUrl={reviewPlayerUrl}
        onClose={() => setReviewPlayerUrl(null)}
      />
    </SafeAreaView>
  );
}
