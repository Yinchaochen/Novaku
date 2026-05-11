import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { UserQRCodeModal } from '../../components/UserQRCodeModal';
import { useLanguage } from '../../context/LanguageContext';
import { CommunityPostCard } from '../../features/community/CommunityPostCard';
import { CommunityPostDetailModal } from '../../features/community/CommunityPostDetailModal';
import {
  CommunityPost,
  useFollowUser,
  useUnfollowUser,
  useUserCommentedPosts,
  useUserLikedPosts,
  useUserPosts,
  useUserProfile,
  useUserSavedPosts,
} from '../../features/community/useCommunity';
import {
  useAcceptFriendRequest,
  useSendFriendRequest,
} from '../../features/social/useSocial';
import { numericDisplayId } from '../../lib/displayId';
import { resolveMediaUrl } from '../../lib/media';
import { useAuthStore } from '../../store/authStore';

function showCopiedToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
}

type UserProfileTab = 'notes' | 'comments' | 'saves' | 'likes';

function HeroAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const resolved = resolveMediaUrl(avatarUrl);
  if (resolved) {
    return (
      <Image
        source={resolved}
        contentFit="cover"
        style={{ width: 80, height: 80, borderRadius: 40 }}
      />
    );
  }
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: 80, height: 80, backgroundColor: '#FFE6EA' }}
    >
      <Text style={{ color: '#F47C7C', fontSize: 32, fontWeight: '700' }}>
        {name.trim().slice(0, 1).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

function StatColumn({ value, label }: { value: number; label: string }) {
  const formatted = value > 999 ? `${(value / 1000).toFixed(1)}k` : String(value);
  return (
    <View className="items-center">
      <Text className="text-[18px] font-bold text-black">{formatted}</Text>
      <Text className="mt-0.5 text-[12px] text-neutral-500">{label}</Text>
    </View>
  );
}

function splitColumns(posts: CommunityPost[]) {
  const left: CommunityPost[] = [];
  const right: CommunityPost[] = [];
  let leftWeight = 0;
  let rightWeight = 0;
  for (const post of posts) {
    const weight = post.media_items.length > 0 ? 3 : 2;
    if (leftWeight <= rightWeight) {
      left.push(post);
      leftWeight += weight;
    } else {
      right.push(post);
      rightWeight += weight;
    }
  }
  return { left, right };
}

export default function UserProfileScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const userId = typeof params.id === 'string' ? params.id : null;

  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    if (userId && currentUser?.id && userId === currentUser.id) {
      router.replace('/(tabs)/profile');
    }
  }, [userId, currentUser?.id]);

  const profile = useUserProfile(userId);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const sendFriendRequest = useSendFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const [friendRequestVisible, setFriendRequestVisible] = useState(false);
  const [friendRequestMessage, setFriendRequestMessage] = useState('');

  const profileData = profile.data;

  const visibleTabs = useMemo<{ key: UserProfileTab; label: string }[]>(() => {
    if (!profileData) return [];
    const all: { key: UserProfileTab; label: string; visible: boolean }[] = [
      { key: 'notes', label: t.profile.tab_notes, visible: profileData.tab_notes_public },
      { key: 'comments', label: t.profile.tab_comments, visible: profileData.tab_comments_public },
      { key: 'saves', label: t.profile.tab_saves, visible: profileData.tab_saves_public },
      { key: 'likes', label: t.profile.tab_likes, visible: profileData.tab_likes_public },
    ];
    return all
      .filter((tab) => profileData.viewer_is_self || tab.visible)
      .map(({ key, label }) => ({ key, label }));
  }, [profileData, t]);

  const [activeTab, setActiveTab] = useState<UserProfileTab>('notes');

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  const notesQuery = useUserPosts(userId);
  const commentsQuery = useUserCommentedPosts(userId, activeTab === 'comments');
  const savesQuery = useUserSavedPosts(userId, activeTab === 'saves');
  const likesQuery = useUserLikedPosts(userId, activeTab === 'likes');

  const activeQuery =
    activeTab === 'comments'
      ? commentsQuery
      : activeTab === 'saves'
      ? savesQuery
      : activeTab === 'likes'
      ? likesQuery
      : notesQuery;

  const postList = activeQuery.data ?? [];
  const columns = useMemo(() => splitColumns(postList), [postList]);

  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [qrVisible, setQrVisible] = useState(false);

  // Optimistic updates flip profileData.viewer_is_following in cache the moment
  // the tap fires, so we branch on the cached flag without waiting on the
  // in-flight request.
  const handleToggleFollow = () => {
    if (!profileData) return;
    if (profileData.viewer_is_following) {
      unfollowMutation.mutate(profileData.id);
    } else {
      followMutation.mutate(profileData.id);
    }
  };

  const handleMessage = () => {
    Alert.alert(t.profile.message_button, t.plaza.coming_soon);
  };

  const handleCopyDisplayId = async () => {
    if (!profileData) return;
    const idText = profileData.display_id ?? numericDisplayId(profileData.id);
    await Clipboard.setStringAsync(idText);
    showCopiedToast(t.common.copied_to_clipboard);
  };

  const openFriendRequest = () => {
    setFriendRequestMessage('');
    setFriendRequestVisible(true);
  };

  const submitFriendRequest = async () => {
    if (!profileData) return;
    const message = friendRequestMessage.trim();
    if (!message) return;
    try {
      await sendFriendRequest.mutateAsync({ userId: profileData.id, message });
      setFriendRequestVisible(false);
      await profile.refetch();
    } catch (err) {
      Alert.alert(t.common.error, (err as Error).message ?? '');
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!profileData?.relationship_id) return;
    Alert.alert(
      profileData.display_name,
      t.social.relationship_pending_incoming,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.social.relationship_pending_incoming,
          onPress: async () => {
            try {
              await acceptFriendRequest.mutateAsync(profileData.relationship_id!);
              await profile.refetch();
            } catch (err) {
              Alert.alert(t.common.error, (err as Error).message ?? '');
            }
          },
        },
      ],
    );
  };

  const friendButtonLabel = (() => {
    if (!profileData) return t.social.send_friend_request_title;
    switch (profileData.relationship_state) {
      case 'friends':
        return t.social.relationship_friends;
      case 'outgoing_pending':
        return t.social.relationship_pending_outgoing;
      case 'incoming_pending':
        return t.social.relationship_pending_incoming;
      default:
        return t.social.send_friend_request_title;
    }
  })();

  if (profile.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white" edges={['top']}>
        <ActivityIndicator size="large" color="#F47C7C" />
      </SafeAreaView>
    );
  }

  if (profile.isError || !profileData) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color="#111111" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="person-circle-outline" size={56} color="#D1D5DB" />
          <Text className="mt-3 text-[15px] font-medium text-neutral-700">
            {t.profile.user_not_found_title}
          </Text>
          <Text className="mt-1 text-center text-[13px] text-neutral-400">
            {t.profile.user_not_found_hint}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (profileData.viewer_is_self) {
    return null;
  }

  const isLoadingActive = activeQuery.isLoading && postList.length === 0;
  const isEmpty = !isLoadingActive && postList.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center justify-between border-b border-neutral-100 px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color="#111111" />
        </Pressable>
        <Text numberOfLines={1} className="flex-1 px-4 text-center text-[16px] font-semibold text-black">
          {profileData.display_name}
        </Text>
        <Pressable
          onPress={() => Alert.alert(profileData.display_name, t.plaza.coming_soon)}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#111111" />
        </Pressable>
      </View>

      <ScrollView className="flex-1">
        <View className="px-5 pt-5">
          <View className="flex-row items-center gap-4">
            <HeroAvatar name={profileData.display_name} avatarUrl={profileData.avatar_url} />
            <View className="flex-1">
              <Text className="text-[20px] font-extrabold text-black">{profileData.display_name}</Text>
              <View className="mt-1 flex-row items-center">
                <Text className="text-[12px] text-neutral-500">
                  Postervia ID: {profileData.display_id ?? numericDisplayId(profileData.id)}
                </Text>
                <Pressable
                  onPress={() => void handleCopyDisplayId()}
                  hitSlop={6}
                  className="ml-2"
                >
                  <Ionicons name="copy-outline" size={14} color="#9CA3AF" />
                </Pressable>
                <Pressable
                  onPress={() => setQrVisible(true)}
                  hitSlop={6}
                  className="ml-2"
                >
                  <Ionicons name="qr-code-outline" size={14} color="#9CA3AF" />
                </Pressable>
              </View>
              {profileData.city ? (
                <View className="mt-1 flex-row items-center">
                  <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                  <Text className="ml-1 text-[12px] text-neutral-500">{profileData.city}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="mt-5 flex-row justify-around">
            <StatColumn value={profileData.following_count} label={t.profile.stats_following} />
            <StatColumn value={profileData.follower_count} label={t.profile.stats_followers} />
            <StatColumn
              value={profileData.helpful_received_count + profileData.save_received_count}
              label={t.profile.stats_likes_saves}
            />
          </View>

          {profileData.bio?.trim() ? (
            <Text className="mt-3 text-[14px] leading-5 text-neutral-700">
              {profileData.bio.trim()}
            </Text>
          ) : null}

          {profileData.intent_tags.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap">
              {profileData.intent_tags.slice(0, 4).map((tag) => (
                <View
                  key={tag}
                  className="mb-1.5 mr-1.5 rounded-full bg-[#F5F5F7] px-3 py-1"
                >
                  <Text className="text-[12px] text-neutral-700">#{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View className="mt-4 flex-row gap-2">
            <Pressable
              onPress={handleToggleFollow}
              className="flex-1 items-center justify-center rounded-full py-2.5"
              style={{
                backgroundColor: profileData.viewer_is_following ? '#F5F5F7' : '#F47C7C',
              }}
            >
              <Text
                className="text-[14px] font-semibold"
                style={{ color: profileData.viewer_is_following ? '#6B7280' : '#FFFFFF' }}
              >
                {profileData.viewer_is_following ? t.profile.following_button : t.profile.follow_button}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                switch (profileData.relationship_state) {
                  case 'none':
                    openFriendRequest();
                    break;
                  case 'incoming_pending':
                    void handleAcceptFriendRequest();
                    break;
                  case 'outgoing_pending':
                    // already sent — no-op (button is disabled visually below)
                    break;
                  case 'friends':
                  default:
                    handleMessage();
                    break;
                }
              }}
              disabled={
                profileData.relationship_state === 'outgoing_pending' ||
                acceptFriendRequest.isPending
              }
              className="flex-1 items-center justify-center rounded-full py-2.5"
              style={{
                backgroundColor:
                  profileData.relationship_state === 'none'
                    ? '#111827'
                    : profileData.relationship_state === 'incoming_pending'
                      ? '#F47C7C'
                      : '#F5F5F7',
              }}
            >
              <Text
                className="text-[14px] font-semibold"
                style={{
                  color:
                    profileData.relationship_state === 'none' ||
                    profileData.relationship_state === 'incoming_pending'
                      ? '#FFFFFF'
                      : '#6B7280',
                }}
              >
                {friendButtonLabel}
              </Text>
            </Pressable>
          </View>
        </View>

        {visibleTabs.length > 0 ? (
          <View className="mt-6 border-t border-neutral-100">
            <View className="flex-row px-3 pt-3">
              {visibleTabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    className="items-center px-4 py-2"
                  >
                    <Text
                      className={`text-[13px] font-semibold ${
                        isActive ? 'text-[#F47C7C]' : 'text-neutral-400'
                      }`}
                    >
                      {tab.label}
                    </Text>
                    {isActive ? (
                      <View className="mt-1 h-[2px] w-6 rounded-full bg-[#F47C7C]" />
                    ) : (
                      <View className="mt-1 h-[2px] w-6" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {isLoadingActive ? (
              <View className="items-center py-10">
                <ActivityIndicator size="small" color="#F47C7C" />
              </View>
            ) : isEmpty ? (
              <View className="items-center py-12">
                <Text className="text-[13px] text-neutral-400">
                  {t.profile.no_public_posts}
                </Text>
              </View>
            ) : (
              <View className="mt-3 flex-row gap-3 px-3 pb-12">
                <View className="flex-1">
                  {columns.left.map((post) => (
                    <CommunityPostCard key={post.id} post={post} onPress={setSelectedPost} />
                  ))}
                </View>
                <View className="flex-1">
                  {columns.right.map((post) => (
                    <CommunityPostCard key={post.id} post={post} onPress={setSelectedPost} />
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View className="mt-10 items-center px-8">
            <Text className="text-[13px] text-neutral-400">
              {t.profile.privacy_tab_hidden_for_viewer}
            </Text>
          </View>
        )}
      </ScrollView>

      <CommunityPostDetailModal
        visible={selectedPost !== null}
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
      />

      <UserQRCodeModal
        visible={qrVisible}
        userId={profileData.id}
        displayId={profileData.display_id}
        displayName={profileData.display_name}
        avatarUrl={profileData.avatar_url}
        onClose={() => setQrVisible(false)}
      />

      <Modal
        visible={friendRequestVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFriendRequestVisible(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/40"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            className="rounded-t-3xl bg-white px-5 pt-4"
            style={{ paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 32) : 32 }}
          >
            <View className="mb-3 self-center h-1 w-10 rounded-full bg-neutral-200" />
            <Text className="text-[17px] font-bold text-black">
              {t.social.send_friend_request_title}
            </Text>
            <Text className="mt-1 text-[12px] text-neutral-500">
              {t.social.send_friend_request_message_label}
            </Text>
            <TextInput
              value={friendRequestMessage}
              onChangeText={setFriendRequestMessage}
              placeholder={t.social.send_friend_request_default}
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={200}
              className="mt-3 min-h-[88px] rounded-2xl bg-[#F5F5F7] px-4 py-3 text-[14px] text-black"
              style={{ textAlignVertical: 'top' }}
            />
            <Text className="mt-1 text-right text-[11px] text-neutral-400">
              {friendRequestMessage.length} / 200
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => setFriendRequestVisible(false)}
                className="flex-1 items-center justify-center rounded-full bg-[#F5F5F7] py-3"
              >
                <Text className="text-[14px] font-semibold text-neutral-700">
                  {t.social.messages_search_cancel}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void submitFriendRequest()}
                disabled={!friendRequestMessage.trim() || sendFriendRequest.isPending}
                className="flex-1 items-center justify-center rounded-full py-3"
                style={{
                  backgroundColor: friendRequestMessage.trim() ? '#111827' : '#9CA3AF',
                }}
              >
                {sendFriendRequest.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-[14px] font-semibold text-white">
                    {t.social.send_friend_request_title}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
