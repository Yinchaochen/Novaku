import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '../../components/AppBackground';
import { AvatarCropper } from '../../components/AvatarCropper';
import { ChalkIcon } from '../../components/ChalkIcon';
import { GlassCard } from '../../components/GlassCard';
import { LanguagePicker } from '../../components/LanguagePicker';
import { OnboardingModal } from '../../components/OnboardingModal';
import { PrivacyModal } from '../../components/PrivacyModal';
import { UserQRCodeModal } from '../../components/UserQRCodeModal';
import { useLanguage } from '../../context/LanguageContext';
import { colors, gradients, shadows } from '../../theme/tokens';
import { useUpdateProfile, useUploadAvatar } from '../../features/auth/useAuth';
import { CommunityPostDetailModal } from '../../features/community/CommunityPostDetailModal';
import {
  CommunityPost,
  useMyCommunityPosts,
  useMyCommentedPosts,
  useMyLikedPosts,
  useMySavedPosts,
  useMyViewedPosts,
  useClearViewHistory,
} from '../../features/community/useCommunity';
import { useSocialOverview } from '../../features/social/useSocial';
import { numericDisplayId } from '../../lib/displayId';
import { formatDisplayLocation } from '../../lib/displayLocation';
import { resolveMediaUrl } from '../../lib/media';
import { useAuthStore } from '../../store/authStore';

type ProfileTab = 'notes' | 'comments' | 'saves' | 'likes';

const PROFILE_ACTION_BUTTON_SIZE = 48;
const PROFILE_ACTION_ICON_SIZE = 27;

function ScanQrMark({ color = '#FFFFFF', size = PROFILE_ACTION_ICON_SIZE }: { color?: string; size?: number }) {
  const cornerSize = Math.round(size * 0.26);
  const qrSize = Math.round(size * 0.43);
  const block = Math.max(3, Math.round(size * 0.12));
  const qrInset = (size - qrSize) / 2;
  const cornerWidth = 2;
  const blockPositions = [
    [0, 0],
    [qrSize - block, 0],
    [0, qrSize - block],
    [qrSize - block, qrSize - block],
    [Math.round((qrSize - block) / 2), Math.round((qrSize - block) / 2)],
    [0, Math.round((qrSize - block) / 2)],
    [Math.round((qrSize - block) / 2), qrSize - block],
  ];

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: cornerSize,
          height: cornerSize,
          borderLeftWidth: cornerWidth,
          borderTopWidth: cornerWidth,
          borderColor: color,
          borderTopLeftRadius: 4,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: cornerSize,
          height: cornerSize,
          borderRightWidth: cornerWidth,
          borderTopWidth: cornerWidth,
          borderColor: color,
          borderTopRightRadius: 4,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: cornerSize,
          height: cornerSize,
          borderLeftWidth: cornerWidth,
          borderBottomWidth: cornerWidth,
          borderColor: color,
          borderBottomLeftRadius: 4,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: cornerSize,
          height: cornerSize,
          borderRightWidth: cornerWidth,
          borderBottomWidth: cornerWidth,
          borderColor: color,
          borderBottomRightRadius: 4,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: qrInset,
          top: qrInset,
          width: qrSize,
          height: qrSize,
        }}
      >
        {blockPositions.map(([left, top], index) => (
          <View
            key={`${left}-${top}-${index}`}
            style={{
              position: 'absolute',
              left,
              top,
              width: block,
              height: block,
              borderRadius: 1.5,
              backgroundColor: color,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function toAvatarPayload(asset: ImagePicker.ImagePickerAsset) {
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    fileName: asset.fileName ?? `avatar-${Date.now()}.jpg`,
  };
}

function formatPostDate(value: string | null | undefined, langCode: string) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(langCode, { month: 'short', day: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

function splitArchivePosts(posts: CommunityPost[]) {
  const left: CommunityPost[] = [];
  const right: CommunityPost[] = [];
  let leftWeight = 0;
  let rightWeight = 0;

  for (const post of posts) {
    const weight = (post.media_items.length > 0 ? 2.3 : 1.5) + Math.min(post.title.length / 80, 0.8);
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

function getArchiveVisualHeight(post: CommunityPost) {
  const seed = post.id.charCodeAt(0) % 3;
  if (post.media_items.length > 0) {
    return seed === 0 ? 220 : seed === 1 ? 276 : 244;
  }
  return seed === 0 ? 150 : seed === 1 ? 190 : 170;
}

function ArchiveCard({
  post,
  langCode,
  postTypeLabel,
  onPress,
}: {
  post: CommunityPost;
  langCode: string;
  postTypeLabel: string;
  onPress: (post: CommunityPost) => void;
}) {
  const coverUri = resolveMediaUrl(post.media_items[0]?.media_url) ?? post.media_items[0]?.media_url ?? null;
  const title = post.translated_title ?? post.title;
  const body = post.translated_body ?? post.body;
  // Warm accent palette — recommendation = coral, guide = cream, others = lavender.
  const accent =
    post.post_type === 'recommendation'
      ? '#FFE8DA'
      : post.post_type === 'guide'
        ? '#FFF1D9'
        : '#EFE9FF';
  const accentText =
    post.post_type === 'recommendation'
      ? colors.brandCoral
      : post.post_type === 'guide'
        ? '#B07A1E'
        : '#6B5CD9';
  const engagement = post.helpful_count + post.save_count;
  const postDate = formatPostDate(post.created_at, langCode);
  const imageHeight = getArchiveVisualHeight(post);

  return (
    <View
      style={{
        marginBottom: 14,
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        ...shadows.card,
      }}
    >
      <Pressable onPress={() => onPress(post)}>
        {coverUri ? (
          <Image
            source={coverUri}
            contentFit="cover"
            transition={120}
            style={{ width: '100%', height: imageHeight }}
          />
        ) : (
          <View
            style={{
              height: imageHeight,
              backgroundColor: accent,
              paddingHorizontal: 16,
              paddingTop: 18,
              paddingBottom: 14,
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: 'rgba(255,255,255,0.9)',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: accentText, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6 }}>
                {postTypeLabel}
              </Text>
            </View>
            <Text
              style={{
                marginTop: 12,
                fontSize: 16,
                fontWeight: '700',
                lineHeight: 22,
                color: colors.textMain,
              }}
              numberOfLines={3}
            >
              {body}
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFFFFF' }}>
          <Text
            style={{ fontSize: 14.5, fontWeight: '700', lineHeight: 20, color: colors.textMain }}
            numberOfLines={2}
          >
            {title}
          </Text>
          <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11.5, color: colors.textSubtle, letterSpacing: 0.2 }}>{postDate}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="heart-outline" size={14} color={colors.textMuted} />
              <Text style={{ marginLeft: 4, fontSize: 11.5, color: colors.textMuted }}>{engagement}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function CommentRecordRow({
  post,
  langCode,
  onPress,
}: {
  post: CommunityPost;
  langCode: string;
  onPress: (post: CommunityPost) => void;
}) {
  const coverUri = resolveMediaUrl(post.media_items[0]?.media_url) ?? post.media_items[0]?.media_url ?? null;
  const postDate = formatPostDate(post.created_at, langCode);
  const excerpt = post.viewer_commented_excerpt ?? '';

  return (
    <Pressable
      onPress={() => onPress(post)}
      style={({ pressed }) => [
        {
          marginBottom: 10,
          flexDirection: 'row',
          gap: 12,
          padding: 12,
          borderRadius: 20,
          backgroundColor: '#FFFFFF',
          ...shadows.iconButton,
        },
        pressed ? { transform: [{ scale: 0.99 }], opacity: 0.96 } : null,
      ]}
    >
      {coverUri ? (
        <Image source={coverUri} contentFit="cover" style={{ width: 64, height: 64, borderRadius: 16 }} />
      ) : (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFE8DA',
          }}
        >
          <Ionicons name="document-text-outline" size={22} color={colors.brandCoral} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMain }} numberOfLines={1}>
          {post.translated_title ?? post.title}
        </Text>
        {excerpt ? (
          <Text style={{ marginTop: 4, fontSize: 13, color: colors.textMuted, lineHeight: 18 }} numberOfLines={2}>
            {excerpt}
          </Text>
        ) : null}
        <Text style={{ marginTop: 6, fontSize: 11.5, color: colors.textSubtle }} numberOfLines={1}>
          {postDate ? `${postDate} · ` : ''}@{post.author.display_name}
        </Text>
      </View>
    </Pressable>
  );
}

type PostsQueryShape = {
  data?: CommunityPost[];
  isLoading: boolean;
  isError: boolean;
};

function ProfilePostsPane({
  activeTab,
  langCode,
  t,
  commentedQuery,
  savedQuery,
  likedQuery,
  onOpenPost,
}: {
  activeTab: ProfileTab;
  langCode: string;
  t: ReturnType<typeof useLanguage>['t'];
  commentedQuery: PostsQueryShape;
  savedQuery: PostsQueryShape;
  likedQuery: PostsQueryShape;
  onOpenPost: (post: CommunityPost) => void;
}) {
  const query =
    activeTab === 'comments' ? commentedQuery : activeTab === 'saves' ? savedQuery : likedQuery;
  const items = query.data ?? [];

  if (query.isLoading && items.length === 0) {
    return (
      <View className="mt-10 items-center">
        <ActivityIndicator size="large" color="#F47C7C" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <GlassCard tone="white" radiusKey="3xl" padding={28} style={{ marginTop: 16, alignItems: 'center' }}>
        <Text style={{ color: colors.danger, fontSize: 14 }}>{t.common.error}</Text>
      </GlassCard>
    );
  }

  if (items.length === 0) {
    const emptyTitle =
      activeTab === 'comments'
        ? t.profile.empty_comments_title
        : activeTab === 'saves'
        ? t.profile.empty_saves_title
        : t.profile.empty_likes_title;
    const emptyHint =
      activeTab === 'comments'
        ? t.profile.empty_comments_hint
        : activeTab === 'saves'
        ? t.profile.empty_saves_hint
        : t.profile.empty_likes_hint;

    return (
      <GlassCard tone="white" radiusKey="3xl" padding={32} style={{ marginTop: 16, alignItems: 'center' }}>
        <Text style={{ fontSize: 26, opacity: 0.45, marginBottom: 10 }}>✦</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textMain, textAlign: 'center' }}>{emptyTitle}</Text>
        <Text
          style={{ marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center' }}
        >
          {emptyHint}
        </Text>
      </GlassCard>
    );
  }

  if (activeTab === 'comments') {
    return (
      <View className="mt-4">
        {items.map((post) => (
          <CommentRecordRow key={post.id} post={post} langCode={langCode} onPress={onOpenPost} />
        ))}
      </View>
    );
  }

  // saves / likes — reuse double-column ArchiveCard grid
  const split = splitArchivePosts(items);
  return (
    <View className="mt-4 flex-row gap-3">
      <View className="flex-1">
        {split.left.map((post) => (
          <ArchiveCard
            key={post.id}
            post={post}
            langCode={langCode}
            postTypeLabel={t.plaza[`type_${post.post_type}`]}
            onPress={onOpenPost}
          />
        ))}
      </View>
      <View className="flex-1">
        {split.right.map((post) => (
          <ArchiveCard
            key={post.id}
            post={post}
            langCode={langCode}
            postTypeLabel={t.plaza[`type_${post.post_type}`]}
            onPress={onOpenPost}
          />
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { t, langCode } = useLanguage();
  const { user, logout } = useAuthStore();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [draftName, setDraftName] = useState(user?.display_name ?? '');
  const [draftOriginCity, setDraftOriginCity] = useState(user?.origin_city ?? '');
  const [draftGender, setDraftGender] = useState<
    'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null
  >(user?.gender ?? null);
  const [avatarPreview, setAvatarPreview] = useState<{
    uri: string;
    mimeType: string;
    fileName: string;
  } | null>(null);
  // Raw image picked from the gallery, queued for the custom crop UI. We
  // bypass ImagePicker's built-in `allowsEditing` cropper because (a) it
  // forces a square frame even though our avatar is rendered as a circle
  // everywhere and (b) the Done button is invisible on some Android skins.
  const [cropperAsset, setCropperAsset] = useState<{
    uri: string;
    width: number;
    height: number;
    fileName: string | null;
  } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('notes');
  const [notesSubTab, setNotesSubTab] = useState<'public' | 'private'>('public');
  const [showBrowsingHistory, setShowBrowsingHistory] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const myPostsQuery = useMyCommunityPosts(24);
  const myCommentedQuery = useMyCommentedPosts(activeTab === 'comments');
  const mySavedQuery = useMySavedPosts(activeTab === 'saves');
  const myLikedQuery = useMyLikedPosts(activeTab === 'likes');
  const myHistoryQuery = useMyViewedPosts(showBrowsingHistory);
  const clearHistory = useClearViewHistory();
  const socialOverview = useSocialOverview();

  const posts = myPostsQuery.data ?? [];
  const visibleNotes = useMemo(
    () => posts.filter((post) => (post.visibility ?? 'public') === notesSubTab),
    [posts, notesSubTab],
  );
  const archiveColumns = useMemo(() => splitArchivePosts(visibleNotes), [visibleNotes]);
  const heroMediaUri =
    resolveMediaUrl(posts[0]?.media_items[0]?.media_url) ??
    posts[0]?.media_items[0]?.media_url ??
    resolveMediaUrl(user?.avatar_url) ??
    null;
  const savedAvatarUri = resolveMediaUrl(user?.avatar_url) ?? null;
  const viewerAvatarUri = avatarPreview?.uri ?? savedAvatarUri;
  const displayBaseCity = formatDisplayLocation(user?.city) ?? user?.city ?? 'Berlin';
  const displayOriginCity = formatDisplayLocation(user?.origin_city) ?? user?.origin_city ?? null;
  const identityLabel = user ? t.auth[`identity_${user.identity}`] : '';
  const arrivalStageLabel = user?.arrival_stage ? t.onboarding[`stage_${user.arrival_stage}`] : null;
  const postsStat = posts.length;
  const likesAndSavesStat = posts.reduce((sum, post) => sum + post.helpful_count + post.save_count, 0);
  const friendsCount = socialOverview.data?.friends.length ?? 0;
  const shortId = user?.display_id ?? (user?.id ? numericDisplayId(user.id) : '—');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const isSavingProfile = updateProfile.isPending;
  const isUploadingAvatar = uploadAvatar.isPending;
  const normalizedName = draftName.trim();
  const normalizedOriginCity = draftOriginCity.trim();
  const canSaveProfile =
    Boolean(user) &&
    Boolean(normalizedName) &&
    !isSavingProfile &&
    (normalizedName !== (user?.display_name ?? '') ||
      normalizedOriginCity !== (user?.origin_city ?? '') ||
      draftGender !== (user?.gender ?? null));

  useEffect(() => {
    setDraftName(user?.display_name ?? '');
    setDraftOriginCity(user?.origin_city ?? '');
    setDraftGender(user?.gender ?? null);
  }, [user?.display_name, user?.origin_city, user?.gender]);

  // Picked image hands off to AvatarCropper, which does the in-app circular
  // crop and immediately uploads on Confirm.
  const openCropperWith = (asset: ImagePicker.ImagePickerAsset) => {
    setFeedback(null);
    setCropperAsset({
      uri: asset.uri,
      width: asset.width ?? 1024,
      height: asset.height ?? 1024,
      fileName: asset.fileName ?? null,
    });
  };

  const handleCropperConfirm = async (croppedUri: string) => {
    // Confirm = Save in one step (matches user expectation of "tap confirm,
    // avatar is saved"). Upload runs while the cropper modal stays open with
    // its own Confirm-button spinner; on success we close both modals and the
    // profile picture refreshes via the `me` query invalidation in
    // useUploadAvatar.
    const fileName = cropperAsset?.fileName ?? `avatar-${Date.now()}.jpg`;
    try {
      await uploadAvatar.mutateAsync({
        uri: croppedUri,
        mimeType: 'image/jpeg', // ImageManipulator always emits JPEG here
        fileName,
      });
      setCropperAsset(null);
      setShowAvatarViewer(false);
      setFeedback(t.profile.save_success);
    } catch (err) {
      setFeedback(t.common.error);
      // Re-throw so the cropper resets its Confirm spinner and the user can
      // either retry or hit Cancel.
      throw err;
    }
  };

  const handleCropperCancel = () => {
    setCropperAsset(null);
  };

  const closeAvatarViewer = () => {
    if (!isUploadingAvatar) {
      setAvatarPreview(null);
      setShowAvatarViewer(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const restorePendingAvatar = async () => {
      const result = await ImagePicker.getPendingResultAsync();
      if (!mounted || !result || 'code' in result || result.canceled || !result.assets?.[0]) {
        return;
      }

      // Android may have suspended Expo Go for the photo permission prompt
      // between pick and crop. When we resume, open the viewer + cropper so
      // the user picks up exactly where they left off.
      setShowAvatarViewer(true);
      openCropperWith(result.assets[0]);
    };

    void restorePendingAvatar();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    // Navigate FIRST so profile.tsx unmounts before user becomes null.
    // Otherwise React renders profile.tsx once more with user=null between
    // the auth-store update and the route change, which can trigger
    // "Rendered fewer hooks than expected" if any hook path conditionally
    // branches on user existing.
    router.replace('/(auth)/login');
    await logout();
  };

  const handlePickAvatar = async () => {
    setFeedback(null);
    try {
      // `allowsEditing: false` — we render our own circular cropper instead
      // of the OS one (which only does square frames and has an inconsistent
      // Done-button position across Android skins).
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.92,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      openCropperWith(result.assets[0]);
    } catch {
      setFeedback(t.common.error);
    }
  };

  const handleShareAvatar = async () => {
    const shareUri = avatarPreview?.uri ?? resolveMediaUrl(user?.avatar_url) ?? null;
    if (!shareUri) {
      return;
    }

    try {
      await Share.share({
        message: shareUri,
        url: shareUri,
      });
    } catch {
      setFeedback(t.common.error);
    }
  };

  const handleShareProfile = async () => {
    if (!user) {
      return;
    }

    const lines = [
      user.display_name,
      `${t.profile.base_in_label} ${displayBaseCity}`,
      displayOriginCity ? `${t.profile.from_label} ${displayOriginCity}` : null,
    ].filter(Boolean);

    try {
      await Share.share({
        message: lines.join('\n'),
      });
    } catch {
      setFeedback(t.common.error);
    }
  };

  const handleSaveProfile = async () => {
    if (!canSaveProfile || !user) {
      return;
    }

    setFeedback(null);
    try {
      await updateProfile.mutateAsync({
        display_name: normalizedName,
        origin_city: normalizedOriginCity || null,
        gender: draftGender ?? undefined,
      });
      setShowEditModal(false);
      setFeedback(t.profile.save_success);
    } catch {
      setFeedback(t.common.error);
    }
  };

  const handleLocaleSelect = async (nextLocale: { code: string }) => {
    setFeedback(null);
    try {
      await updateProfile.mutateAsync({ locale: nextLocale.code });
    } catch {
      setFeedback(t.common.error);
    }
  };

  const TABS: { key: ProfileTab; label: string; locked: boolean; minWidth: number }[] = [
    { key: 'notes', label: t.profile.tab_notes, locked: false, minWidth: 82 },
    { key: 'comments', label: t.profile.tab_comments, locked: false, minWidth: 118 },
    { key: 'saves', label: t.profile.tab_saves, locked: false, minWidth: 86 },
    { key: 'likes', label: t.profile.tab_likes, locked: false, minWidth: 82 },
  ];

  return (
    <AppBackground>
    <SafeAreaView className="flex-1" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* ── HERO ── */}
        <View style={{ backgroundColor: heroMediaUri ? colors.textBrown : '#3B2A22' }}>
          {heroMediaUri ? (
            <Image source={heroMediaUri} contentFit="cover" transition={120} style={StyleSheet.absoluteFillObject} />
          ) : null}
          {/* Warm overlay — replaces the harsh black overlay with a soft brown gradient. */}
          <LinearGradient
            colors={gradients.heroOverlay as unknown as [string, string]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Subtle peach light leak at top-right for warmth */}
          <LinearGradient
            colors={['rgba(255, 170, 122, 0.30)', 'rgba(255, 170, 122, 0)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.4, y: 0.6 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          <View className="px-5 pb-6 pt-3">
            {/* TOP BAR */}
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setShowMenuSheet(true)}
                style={({ pressed }) => [
                  {
                    height: 42,
                    width: 42,
                    borderRadius: 21,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.35)',
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  },
                  pressed ? { transform: [{ scale: 0.94 }] } : null,
                ]}
              >
                <ChalkIcon name="menu" size={24} color="#FFFFFF" />
              </Pressable>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <LanguagePicker currentCode={user?.locale ?? langCode} onSelect={handleLocaleSelect} />
                <Pressable
                  onPress={() => router.push('/scan' as never)}
                  style={({ pressed }) => [
                    {
                      height: PROFILE_ACTION_BUTTON_SIZE,
                      width: PROFILE_ACTION_BUTTON_SIZE,
                      borderRadius: PROFILE_ACTION_BUTTON_SIZE / 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.42)',
                      backgroundColor: 'rgba(255,255,255,0.20)',
                    },
                    pressed ? { transform: [{ scale: 0.94 }] } : null,
                  ]}
                >
                  <ScanQrMark />
                </Pressable>
                <Pressable
                  onPress={handleShareProfile}
                  style={({ pressed }) => [
                    {
                      height: PROFILE_ACTION_BUTTON_SIZE,
                      width: PROFILE_ACTION_BUTTON_SIZE,
                      borderRadius: PROFILE_ACTION_BUTTON_SIZE / 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.42)',
                      backgroundColor: 'rgba(255,255,255,0.20)',
                    },
                    pressed ? { transform: [{ scale: 0.94 }] } : null,
                  ]}
                >
                  <Ionicons name="share-social-outline" size={23} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {/* AVATAR + NAME */}
            <View className="mt-5 flex-row items-center">
              <Pressable onPress={() => setShowAvatarViewer(true)}>
                <View
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: 43,
                    padding: 3,
                    backgroundColor: 'rgba(255,255,255,0.85)',
                    shadowColor: '#000',
                    shadowOpacity: 0.18,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 6,
                  }}
                >
                  {savedAvatarUri ? (
                    <Image
                      source={savedAvatarUri}
                      contentFit="cover"
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: '#FFE8DA',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.brandCoral }}>
                        {user?.display_name?.slice(0, 1).toUpperCase() ?? 'N'}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
              <View className="ml-4 flex-1">
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    letterSpacing: -0.2,
                    textShadowColor: 'rgba(0,0,0,0.45)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 6,
                  }}
                >
                  {user?.display_name ?? 'Postervia'}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 }}>
                    Postervia ID: {shortId}
                  </Text>
                  <Pressable
                    onPress={async () => {
                      if (!user?.display_id && !user?.id) return;
                      await Clipboard.setStringAsync(shortId);
                      if (Platform.OS === 'android') {
                        ToastAndroid.show(t.common.copied_to_clipboard, ToastAndroid.SHORT);
                      } else {
                        Alert.alert(t.common.copied_to_clipboard);
                      }
                    }}
                    hitSlop={6}
                    className="ml-2"
                  >
                    <Ionicons name="copy-outline" size={14} color="rgba(255,255,255,0.7)" />
                  </Pressable>
                  <Pressable onPress={() => setQrModalVisible(true)} hitSlop={6} className="ml-2">
                    <Ionicons name="qr-code-outline" size={14} color="rgba(255,255,255,0.7)" />
                  </Pressable>
                </View>
                <Text style={{ marginTop: 2, fontSize: 11.5, color: 'rgba(255,255,255,0.7)' }}>
                  {t.profile.ip_label}：{displayBaseCity}
                </Text>
              </View>
            </View>

            {/* BIO — translucent glass capsule */}
            <Pressable
              onPress={() => router.push('/edit-bio' as never)}
              style={({ pressed }) => [
                {
                  marginTop: 18,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: 'rgba(255,255,255,0.16)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.22)',
                },
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  lineHeight: 19,
                  color: user?.bio ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.65)',
                }}
                numberOfLines={3}
              >
                {user?.bio?.trim() || t.profile.bio_placeholder}
              </Text>
            </Pressable>

            {/* STATS — slim translucent strip, not a thick card */}
            <View
              style={{
                marginTop: 14,
                flexDirection: 'row',
                borderRadius: 18,
                paddingVertical: 10,
                paddingHorizontal: 6,
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.22)',
              }}
            >
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{friendsCount}</Text>
                <Text style={{ marginTop: 1, fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 }}>
                  {t.profile.stats_following}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{friendsCount}</Text>
                <Text style={{ marginTop: 1, fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 }}>
                  {t.profile.stats_followers}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{likesAndSavesStat}</Text>
                <Text style={{ marginTop: 1, fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 }}>
                  {t.profile.stats_likes_saves}
                </Text>
              </View>
            </View>

            {/* UTILITY BUTTONS — restored old proportions: 42×42 icon container,
                32-34 chalk icon at 75% white. Translucent tile bg keeps the
                glass treatment that came in with the Profile redesign. */}
            <View className="mt-3 flex-row gap-3">
              <Pressable
                onPress={() => setShowBrowsingHistory(true)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderRadius: 18,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.24)',
                  },
                  pressed ? { transform: [{ scale: 0.99 }] } : null,
                ]}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ChalkIcon name="history" size={32} color="rgba(255,255,255,0.85)" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>
                    {t.profile.browsing_history}
                  </Text>
                  <Text style={{ marginTop: 2, fontSize: 11, color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
                    {t.profile.browsing_history_hint}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => router.navigate('/(tabs)/tasks')}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderRadius: 18,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: 'rgba(255,255,255,0.16)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.24)',
                  },
                  pressed ? { transform: [{ scale: 0.99 }] } : null,
                ]}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ChalkIcon name="odyssey" size={34} color="rgba(255,255,255,0.85)" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }} numberOfLines={1}>
                    {t.profile.odyssey_shortcut}
                  </Text>
                  <Text style={{ marginTop: 2, fontSize: 11, color: 'rgba(255,255,255,0.7)' }} numberOfLines={1}>
                    {displayBaseCity}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── TAB BAR — horizontal scroll, content-width items so labels never
            wrap and the row can pan when it overflows. The earlier `flex: 1`
            layout squeezed "Comments" into two lines on narrow Android. The
            trailing search icon was removed per product feedback. ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            backgroundColor: 'rgba(255,255,255,0.55)',
            borderBottomWidth: 1,
            borderBottomColor: colors.lineSofter,
          }}
          contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 6, paddingBottom: 4, alignItems: 'center' }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{ paddingHorizontal: 5, paddingTop: 6, paddingBottom: 8, alignItems: 'center' }}
              >
                <View
                  style={{
                    minWidth: tab.minWidth,
                    height: 34,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 17,
                    overflow: 'hidden',
                    paddingHorizontal: 16,
                    backgroundColor: active ? '#FFE8DA' : 'transparent',
                  }}
                >
                  {tab.locked ? <Ionicons name="lock-closed-outline" size={11} color={colors.textSubtle} /> : null}
                  <Text
                    numberOfLines={1}
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: active ? colors.brandCoral : colors.textMuted,
                      letterSpacing: 0.1,
                    }}
                  >
                    {tab.label}
                  </Text>
                </View>
                <View
                  style={{
                    marginTop: 6,
                    height: 2.5,
                    width: 22,
                    borderRadius: 999,
                    backgroundColor: active ? colors.brandCoral : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── NOTES SUB-TABS ── */}
        {activeTab === 'notes' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 18,
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textMain }}>
              {t.profile.notes_public} {postsStat}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSubtle }}>Private 0</Text>
            <Text style={{ fontSize: 14, color: colors.textSubtle }}>Album 0</Text>
          </View>
        ) : null}

        {/* ── CONTENT ── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 130 }}>
          {feedback ? (
            <GlassCard tone="white" radiusKey="lg" padding={14} style={{ marginTop: 14 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: feedback === t.common.error ? colors.danger : colors.textMuted,
                }}
              >
                {feedback}
              </Text>
            </GlassCard>
          ) : null}

          {activeTab === 'notes' ? (
            myPostsQuery.isLoading ? (
              <View className="mt-10 items-center">
                <ActivityIndicator size="large" color={colors.brandCoral} />
              </View>
            ) : myPostsQuery.isError ? (
              <GlassCard tone="white" radiusKey="3xl" padding={28} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.danger, fontSize: 14 }}>{t.common.error}</Text>
              </GlassCard>
            ) : posts.length > 0 ? (
              <View className="mt-4">
                <View
                  style={{
                    marginBottom: 12,
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.86)',
                    padding: 4,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.85)',
                    ...shadows.iconButton,
                  }}
                >
                  {(['public', 'private'] as const).map((sub) => {
                    const active = notesSubTab === sub;
                    return (
                      <Pressable
                        key={sub}
                        onPress={() => setNotesSubTab(sub)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 6,
                          borderRadius: 999,
                          overflow: 'hidden',
                        }}
                      >
                        {active ? (
                          <LinearGradient
                            colors={gradients.brandCta as unknown as [string, string]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                          />
                        ) : null}
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            letterSpacing: 0.2,
                            color: active ? '#FFFFFF' : colors.textMuted,
                          }}
                        >
                          {sub === 'public' ? t.plaza.profile_tab_public : t.plaza.profile_tab_private}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {visibleNotes.length > 0 ? (
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      {archiveColumns.left.map((post) => (
                        <ArchiveCard
                          key={post.id}
                          post={post}
                          langCode={langCode}
                          postTypeLabel={t.plaza[`type_${post.post_type}`]}
                          onPress={setSelectedPost}
                        />
                      ))}
                    </View>
                    <View className="flex-1">
                      {archiveColumns.right.map((post) => (
                        <ArchiveCard
                          key={post.id}
                          post={post}
                          langCode={langCode}
                          postTypeLabel={t.plaza[`type_${post.post_type}`]}
                          onPress={setSelectedPost}
                        />
                      ))}
                    </View>
                  </View>
                ) : (
                  <GlassCard tone="white" radiusKey="3xl" padding={32} style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, opacity: 0.45, marginBottom: 8 }}>✦</Text>
                    <Text style={{ fontSize: 13.5, color: colors.textMuted, textAlign: 'center', lineHeight: 19 }}>
                      {t.profile.posts_empty_hint}
                    </Text>
                  </GlassCard>
                )}
              </View>
            ) : (
              <GlassCard tone="white" radiusKey="3xl" padding={32} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, opacity: 0.45, marginBottom: 10 }}>✦</Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textMain, textAlign: 'center' }}>
                  {t.profile.posts_empty_title}
                </Text>
                <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center' }}>
                  {t.profile.posts_empty_hint}
                </Text>
              </GlassCard>
            )
          ) : (
            <ProfilePostsPane
              activeTab={activeTab}
              langCode={langCode}
              t={t}
              commentedQuery={myCommentedQuery}
              savedQuery={mySavedQuery}
              likedQuery={myLikedQuery}
              onOpenPost={setSelectedPost}
            />
          )}
        </View>
      </ScrollView>

      {/* BROWSING HISTORY */}
      <Modal visible={showBrowsingHistory} animationType="slide" onRequestClose={() => setShowBrowsingHistory(false)}>
        <SafeAreaView className="flex-1 bg-[#F4F5F8]">
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center">
              <Pressable onPress={() => setShowBrowsingHistory(false)}>
                <Ionicons name="arrow-back" size={26} color="#3B2A22" />
              </Pressable>
              <Text className="ml-3 text-xl font-extrabold text-neutral-900">{t.profile.browsing_history}</Text>
            </View>
            {(myHistoryQuery.data?.length ?? 0) > 0 ? (
              <Pressable
                onPress={() => clearHistory.mutate()}
                disabled={clearHistory.isPending}
                className="rounded-full bg-white px-3 py-1.5"
              >
                <Text className="text-xs font-bold text-neutral-700">{t.profile.history_clear}</Text>
              </Pressable>
            ) : null}
          </View>
          {myHistoryQuery.isLoading && !myHistoryQuery.data ? (
            <View className="mt-10 items-center">
              <ActivityIndicator size="large" color="#F47C7C" />
            </View>
          ) : (myHistoryQuery.data?.length ?? 0) === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Ionicons name="time-outline" size={52} color="#D1D5DB" />
              <Text className="mt-4 text-base font-semibold text-neutral-400">{t.profile.browsing_history_empty}</Text>
            </View>
          ) : (
            <ScrollView className="flex-1 px-4" contentContainerClassName="pb-10">
              {(myHistoryQuery.data ?? []).map((post) => (
                <CommentRecordRow
                  key={post.id}
                  post={post}
                  langCode={langCode}
                  onPress={(p) => {
                    setShowBrowsingHistory(false);
                    setSelectedPost(p);
                  }}
                />
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* MENU SHEET */}
      <Modal visible={showMenuSheet} transparent animationType="slide" onRequestClose={() => setShowMenuSheet(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36,26,22,0.42)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowMenuSheet(false)} />
          <View
            style={{
              borderTopLeftRadius: 36,
              borderTopRightRadius: 36,
              backgroundColor: colors.bgCream,
              paddingHorizontal: 20,
              paddingBottom: 36,
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.85)',
            }}
          >
            <View style={{ marginBottom: 14, alignItems: 'center' }}>
              <View style={{ height: 4, width: 44, borderRadius: 999, backgroundColor: colors.lineSoft }} />
            </View>
            {[
              { label: t.profile.menu_edit_profile, icon: 'pencil-outline' as const, on: () => { setShowMenuSheet(false); setShowEditModal(true); } },
              { label: t.profile.menu_privacy_settings, icon: 'lock-closed-outline' as const, on: () => { setShowMenuSheet(false); setShowPrivacyModal(true); } },
              { label: t.profile.edit_setup_action, icon: 'settings-outline' as const, on: () => { setShowMenuSheet(false); setShowOnboardingModal(true); } },
              { label: t.profile.menu_settings, icon: 'shield-checkmark-outline' as const, on: () => { setShowMenuSheet(false); router.push('/settings' as never); } },
            ].map((row, i) => (
              <Pressable
                key={row.label}
                onPress={row.on}
                style={{
                  marginTop: i === 0 ? 0 : 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 22,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: 'rgba(255,255,255,0.78)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.85)',
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#FFE8DA',
                  }}
                >
                  <Ionicons name={row.icon} size={18} color={colors.brandCoral} />
                </View>
                <Text style={{ marginLeft: 12, fontSize: 15, fontWeight: '700', color: colors.textMain }}>{row.label}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => { setShowMenuSheet(false); void handleLogout(); }}
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderRadius: 22,
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: 'rgba(244, 124, 124, 0.10)',
                borderWidth: 1,
                borderColor: 'rgba(244, 124, 124, 0.20)',
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(244,124,124,0.16)',
                }}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              </View>
              <Text style={{ marginLeft: 12, fontSize: 15, fontWeight: '700', color: colors.danger }}>{t.auth.logout}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View className="flex-1 justify-end bg-black/36">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="rounded-t-[32px] bg-white px-5 pb-7 pt-5">
              <View className="mb-5 flex-row items-center justify-between">
                <Text className="text-2xl font-extrabold text-neutral-900">{t.profile.edit_profile_action}</Text>
                <Pressable onPress={() => setShowEditModal(false)} className="rounded-full bg-neutral-100 p-2">
                  <Ionicons name="close" size={22} color="#3A3A3A" />
                </Pressable>
              </View>

              <Text className="mb-2 text-sm font-semibold text-neutral-700">{t.auth.display_name}</Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder={t.profile.display_name_placeholder}
                maxLength={100}
                className="rounded-[22px] border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-base text-neutral-900"
              />

              <Text className="mb-2 mt-5 text-sm font-semibold text-neutral-700">{t.profile.from_city_label}</Text>
              <TextInput
                value={draftOriginCity}
                onChangeText={setDraftOriginCity}
                placeholder={t.profile.from_placeholder}
                maxLength={100}
                className="rounded-[22px] border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-base text-neutral-900"
              />

              <Text className="mb-2 mt-5 text-sm font-semibold text-neutral-700">{t.profile.gender_label}</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {(['male', 'female', 'non_binary', 'prefer_not_to_say'] as const).map((g) => {
                  const active = draftGender === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setDraftGender(g)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: active ? '#F47C7C' : '#E5E7EB',
                        backgroundColor: active ? '#FFF1F2' : '#FAFAFA',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13.5,
                          fontWeight: '600',
                          color: active ? '#F47C7C' : '#3A3A3A',
                        }}
                      >
                        {t.buddy[`gender_${g}` as const]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="mt-5 rounded-[22px] bg-neutral-50 px-4 py-4">
                <Text className="text-xs font-bold uppercase tracking-[1px] text-neutral-400">
                  {t.profile.base_card_title}
                </Text>
                <Text className="mt-2 text-base font-semibold text-neutral-900">
                  {t.profile.base_in_label} {displayBaseCity}
                </Text>
                <Pressable onPress={() => {
                  setShowEditModal(false);
                  setShowOnboardingModal(true);
                }} className="mt-3 self-start rounded-full bg-white px-3 py-1.5">
                  <Text className="text-xs font-semibold text-primary">{t.profile.edit_setup_action}</Text>
                </Pressable>
              </View>

              <View className="mt-6 flex-row gap-3">
                <View
                  style={{
                    flex: 1,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(255,255,255,0.92)',
                    borderWidth: 1,
                    borderColor: colors.lineSofter,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#7A4A2C',
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 3,
                  }}
                >
                  <Pressable
                    onPress={() => setShowEditModal(false)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      borderRadius: 25,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>
                      {t.common.cancel}
                    </Text>
                  </Pressable>
                </View>
                <View
                  style={{
                    flex: 1,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: canSaveProfile ? '#FF8F7E' : '#E5E0D7',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: canSaveProfile ? 1 : 0.55,
                    shadowColor: colors.brandCoral,
                    shadowOpacity: canSaveProfile ? 0.22 : 0,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: canSaveProfile ? 6 : 0,
                  }}
                >
                  <Pressable
                    onPress={handleSaveProfile}
                    disabled={!canSaveProfile}
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      borderRadius: 25,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSavingProfile ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: canSaveProfile ? '#FFFFFF' : colors.textMuted,
                          textAlign: 'center',
                        }}
                      >
                        {t.common.save}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={showAvatarViewer} animationType="slide" onRequestClose={closeAvatarViewer}>
        <SafeAreaView className="flex-1 bg-[#05070D]">
          <View className="flex-row items-center justify-between px-5 py-4">
            <Pressable onPress={closeAvatarViewer} disabled={isUploadingAvatar}>
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </Pressable>
            <Text className="text-2xl font-semibold text-white">{t.profile.change_avatar}</Text>
            <View className="flex-row items-center gap-4">
              <Pressable onPress={handlePickAvatar} disabled={isUploadingAvatar}>
                <Ionicons
                  name="pencil"
                  size={24}
                  color={isUploadingAvatar ? '#7C879C' : '#FFFFFF'}
                />
              </Pressable>
              <Pressable onPress={handleShareAvatar} disabled={!viewerAvatarUri || isUploadingAvatar}>
                <Ionicons
                  name="share-social-outline"
                  size={24}
                  color={!viewerAvatarUri || isUploadingAvatar ? '#7C879C' : '#FFFFFF'}
                />
              </Pressable>
            </View>
          </View>

          <View className="flex-1 items-center justify-center px-6">
            {viewerAvatarUri ? (
              // Match the circular shape the avatar takes everywhere else in
              // the app (header tile, comments, social search etc.) so the
              // viewer is an honest preview, not a square crop.
              <View
                style={{
                  width: '78%',
                  aspectRatio: 1,
                  borderRadius: 9999,
                  overflow: 'hidden',
                  backgroundColor: '#11151E',
                }}
              >
                <Image
                  source={viewerAvatarUri}
                  contentFit="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
            ) : (
              <View
                className="items-center justify-center rounded-full bg-primary/10"
                style={{ width: 220, height: 220 }}
              >
                <Text className="text-7xl font-extrabold text-primary">
                  {user?.display_name?.slice(0, 1).toUpperCase() ?? 'N'}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Custom circular cropper. Renders on top of the viewer modal once the
          user picks an image; Confirm = save in one step (handleCropperConfirm
          uploads and closes both modals on success). */}
      <Modal
        visible={!!cropperAsset}
        animationType="slide"
        onRequestClose={handleCropperCancel}
      >
        {cropperAsset ? (
          <AvatarCropper
            uri={cropperAsset.uri}
            imageWidth={cropperAsset.width}
            imageHeight={cropperAsset.height}
            onConfirm={handleCropperConfirm}
            onCancel={handleCropperCancel}
          />
        ) : null}
      </Modal>

      <CommunityPostDetailModal
        post={selectedPost}
        visible={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
      />

      <OnboardingModal
        visible={showOnboardingModal}
        mode="edit"
        onDone={() => setShowOnboardingModal(false)}
        onCancel={() => setShowOnboardingModal(false)}
      />

      <PrivacyModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {user ? (
        <UserQRCodeModal
          visible={qrModalVisible}
          userId={user.id}
          displayId={user.display_id}
          displayName={user.display_name}
          avatarUrl={user.avatar_url}
          onClose={() => setQrModalVisible(false)}
        />
      ) : null}
    </SafeAreaView>
    </AppBackground>
  );
}
