import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { colors, shadows } from '../../theme/tokens';
import { useLanguage } from '../../context/LanguageContext';
import { clampAspect } from '../../lib/cardAspect';
import { resolveMediaUrl } from '../../lib/media';
import { useAuthStore } from '../../store/authStore';
import { ActionSheet } from '../../components/ActionSheet';
import { TranslatedText } from './TranslatedText';
import {
  CommunityPost,
  isVideoMedia,
  useHidePost,
  useMarkCommunityHelpful,
  useUnmarkCommunityHelpful,
} from './useCommunity';
import { OfficialChip, isOfficialAuthor } from '../../components/OfficialChip';
import { VerifiedBadge } from '../../components/VerifiedBadge';

function formatDuration(totalSeconds?: number | null): string {
  const safe = Math.max(0, Math.floor(totalSeconds ?? 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

interface Props {
  post: CommunityPost;
  onPress?: (post: CommunityPost) => void;
  /** Search results only: highlight this query inside the displayed title. */
  titleHighlight?: string;
}

// A card without a picture is a coloured panel, and varying its height is what
// keeps a masonry column from looking like a table. Cards WITH a picture take
// their height from the picture instead — see clampAspect.
function getVisualHeight(post: CommunityPost) {
  const seed = post.id.charCodeAt(0) % 3;
  if (post.media_items.length > 0) {
    return seed === 0 ? 220 : seed === 1 ? 276 : 244;
  }
  return seed === 0 ? 150 : seed === 1 ? 190 : 170;
}

/**
 * Warm-palette type color: replaces all cold blue/purple/red with peach,
 * cream, sage and lavender tones.
 */
function getTypeColor(postType: CommunityPost['post_type']) {
  switch (postType) {
    case 'guide':
      return { bg: '#FFF1D9', fg: '#B07A1E' };
    case 'warning':
      return { bg: 'rgba(244, 124, 124, 0.16)', fg: colors.danger };
    case 'question':
      return { bg: '#EFE9FF', fg: '#6B5CD9' };
    case 'recommendation':
      return { bg: '#FFE8DA', fg: colors.brandCoral };
    default:
      return { bg: 'rgba(143, 188, 122, 0.18)', fg: '#5C8A48' };
  }
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const resolvedAvatarUrl = resolveMediaUrl(avatarUrl);

  if (resolvedAvatarUrl) {
    return (
      <Image
        source={resolvedAvatarUrl}
        contentFit="cover"
        style={{ width: 22, height: 22, borderRadius: 11 }}
      />
    );
  }

  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFE8DA',
      }}
    >
      <Text style={{ color: colors.brandCoral, fontSize: 10, fontWeight: '700' }}>
        {name.trim().slice(0, 1).toUpperCase() || 'N'}
      </Text>
    </View>
  );
}

const CARD_TITLE_STYLE = {
  fontSize: 14.5,
  fontWeight: '700',
  lineHeight: 20,
  color: colors.textMain,
  marginBottom: 8,
} as const;

function HighlightedCardTitle({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  const index = trimmed ? text.toLowerCase().indexOf(trimmed.toLowerCase()) : -1;
  if (index === -1) {
    return (
      <Text numberOfLines={2} style={CARD_TITLE_STYLE}>
        {text}
      </Text>
    );
  }
  return (
    <Text numberOfLines={2} style={CARD_TITLE_STYLE}>
      {text.slice(0, index)}
      <Text style={{ color: colors.brandCoral }}>{text.slice(index, index + trimmed.length)}</Text>
      {text.slice(index + trimmed.length)}
    </Text>
  );
}

export function CommunityPostCard({ post, onPress, titleHighlight }: Props) {
  const { t } = useLanguage();
  const helpful = useMarkCommunityHelpful();
  const unhelpful = useUnmarkCommunityHelpful();
  const hidePost = useHidePost();
  const viewerId = useAuthStore((s) => s.user?.id ?? null);
  const isOwnPost = viewerId != null && post.author.id === viewerId;
  const typeColor = getTypeColor(post.post_type);
  const imageHeight = getVisualHeight(post);
  // Unknown until the image reports its size. Until then the card keeps the
  // placeholder height, so the column does not collapse and re-expand.
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const hasEventCandidate = post.action_candidates.some(
    (candidate) => candidate.metadata_json?.['card_type'] === 'event'
  );

  // Optimistic updates flip post.viewer_marked_helpful in the cache the moment
  // the tap fires, so the UI here re-renders with the new state before the
  // network round-trip. We branch on that flag directly — no pending guard,
  // no spinner.
  const handleToggleHelpful = () => {
    if (post.viewer_marked_helpful) {
      unhelpful.mutate(post.id);
    } else {
      helpful.mutate(post.id);
    }
  };

  const openDetail = () => onPress?.(post);

  // Tap avatar / display name → author's profile (or own tab if it's me).
  const openAuthorProfile = () => {
    if (viewerId && post.author.id === viewerId) {
      router.push('/(tabs)/profile');
    } else {
      router.push(`/users/${post.author.id}` as never);
    }
  };

  const [cardActionsVisible, setCardActionsVisible] = useState(false);

  // Card-level "..." menu: per-user hide so the post stops showing on this user's feed.
  // Own posts skip this entry — you can't hide yourself from yourself.
  const openCardActions = () => {
    if (isOwnPost) return;
    setCardActionsVisible(true);
  };

  const confirmHidePost = () => {
    Alert.alert(t.plaza.hide_post, t.plaza.hide_post_confirm_body, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.plaza.hide_post, style: 'destructive', onPress: () => hidePost.mutate(post.id) },
    ]);
  };

  return (
    <View
      style={{
        marginBottom: 6,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        ...shadows.card,
      }}
    >
      <Pressable onPress={openDetail}>
        {post.media_items[0] ? (
          <View>
            <Image
              source={
                resolveMediaUrl(post.media_items[0].thumb_url ?? post.media_items[0].media_url) ??
                post.media_items[0].media_url
              }
              contentFit="cover"
              transition={120}
              onLoad={(event) => {
                const size = event.source;
                setImageAspect(size ? clampAspect(size.width, size.height) : null);
              }}
              style={
                imageAspect
                  ? { width: '100%', aspectRatio: imageAspect, backgroundColor: '#1F1B18' }
                  : { width: '100%', height: imageHeight, backgroundColor: '#1F1B18' }
              }
            />
            {isVideoMedia(post.media_items[0]) ? (
              <>
                {/* D-033 video affordance: centered play glyph + duration. */}
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
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.38)',
                    }}
                  >
                    <Ionicons name="play" size={22} color="rgba(255,255,255,0.95)" />
                  </View>
                </View>
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                    {formatDuration(post.media_items[0].duration_seconds)}
                  </Text>
                </View>
              </>
            ) : null}
            {isOwnPost && post.moderation_status !== 'approved' ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 8,
                  borderRadius: 999,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  backgroundColor:
                    post.moderation_status === 'rejected' ? 'rgba(184, 58, 58, 0.92)' : 'rgba(17, 17, 17, 0.68)',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' }}>
                  {post.moderation_status === 'rejected' ? t.video.status_rejected : t.video.status_in_review}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              // Sized to the words, not to a picture that is not there. A
              // text post used to occupy a full image-height block, which made
              // the two guide cards at the top of the feed the loudest thing
              // on screen and pushed everything else below the fold.
              minHeight: 96,
              backgroundColor: typeColor.bg,
              paddingHorizontal: 12,
              paddingTop: 12,
              paddingBottom: 12,
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                marginBottom: 8,
                backgroundColor: 'rgba(255,255,255,0.85)',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: typeColor.fg, fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6 }}>
                {t.plaza[`type_${post.post_type}`]}
              </Text>
            </View>
            <TranslatedText
              originalText={post.body}
              translatedText={post.translated_body}
              sourceLanguage={post.body_source_language ?? post.source_language}
              numberOfLines={3}
              // Was 16/bold: the body then outweighed the title printed under
              // it, so a reader met the same post twice, louder first.
              textStyle={{ color: colors.textBrown, fontSize: 13, fontWeight: '400', lineHeight: 18 }}
            />
          </View>
        )}
      </Pressable>

      <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
        <Pressable onPress={openDetail}>
          {titleHighlight ? (
            <HighlightedCardTitle
              text={post.translated_title ?? post.title}
              query={titleHighlight}
            />
          ) : (
            <TranslatedText
              originalText={post.title}
              translatedText={post.translated_title}
              sourceLanguage={post.title_source_language ?? post.source_language}
              numberOfLines={2}
              textStyle={{
                fontSize: 14.5,
                fontWeight: '700',
                lineHeight: 20,
                color: colors.textMain,
                marginBottom: 8,
              }}
            />
          )}

          {hasEventCandidate ? (
            <View
              style={{
                alignSelf: 'flex-start',
                marginBottom: 8,
                backgroundColor: '#FFE8DA',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.brandCoral, letterSpacing: 0.5 }}>
                {t.plaza.task_card_event}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            style={{ marginRight: 8, flex: 1, flexDirection: 'row', alignItems: 'center' }}
            onPress={openAuthorProfile}
            hitSlop={4}
          >
            <Avatar name={post.author.display_name} avatarUrl={post.author.avatar_url} />
            <Text
              numberOfLines={1}
              style={{ marginLeft: 8, flexShrink: 1, fontSize: 11.5, color: colors.textMuted }}
            >
              {post.author.display_name}
            </Text>
            {post.author.is_verified ? <VerifiedBadge size={12} /> : null}
            {isOfficialAuthor(post.author) ? <OfficialChip /> : null}
          </Pressable>

          <Pressable
            style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingLeft: 10 }}
            hitSlop={10}
            onPress={handleToggleHelpful}
          >
            <Ionicons
              name={post.viewer_marked_helpful ? 'heart' : 'heart-outline'}
              size={17}
              color={post.viewer_marked_helpful ? colors.brandCoral : colors.textMuted}
            />
            <Text style={{ marginLeft: 4, fontSize: 11.5, color: colors.textMuted }}>
              {post.helpful_count}
            </Text>
          </Pressable>

          {!isOwnPost ? (
            <Pressable
              onPress={openCardActions}
              hitSlop={10}
              style={{ marginLeft: 6, paddingVertical: 6, paddingHorizontal: 6 }}
            >
              <Ionicons name="ellipsis-horizontal" size={17} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ActionSheet
        visible={cardActionsVisible}
        title={t.plaza.more_actions_title}
        onClose={() => setCardActionsVisible(false)}
        actions={[
          {
            label: t.plaza.hide_post,
            icon: 'eye-off-outline',
            destructive: true,
            onPress: confirmHidePost,
          },
        ]}
      />
    </View>
  );
}
