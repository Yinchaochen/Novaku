import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors, shadows } from '../../theme/tokens';
import { useLanguage } from '../../context/LanguageContext';
import { resolveMediaUrl } from '../../lib/media';
import { useAuthStore } from '../../store/authStore';
import { TranslatedText } from './TranslatedText';
import {
  CommunityPost,
  useMarkCommunityHelpful,
  useUnmarkCommunityHelpful,
} from './useCommunity';

interface Props {
  post: CommunityPost;
  onPress?: (post: CommunityPost) => void;
}

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

export function CommunityPostCard({ post, onPress }: Props) {
  const { t } = useLanguage();
  const helpful = useMarkCommunityHelpful();
  const unhelpful = useUnmarkCommunityHelpful();
  const viewerId = useAuthStore((s) => s.user?.id ?? null);
  const typeColor = getTypeColor(post.post_type);
  const imageHeight = getVisualHeight(post);
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
      <Pressable onPress={openDetail}>
        {post.media_items[0] ? (
          <Image
            source={resolveMediaUrl(post.media_items[0].media_url) ?? post.media_items[0].media_url}
            contentFit="cover"
            transition={120}
            style={{ width: '100%', height: imageHeight }}
          />
        ) : (
          <View
            style={{
              height: imageHeight,
              backgroundColor: typeColor.bg,
              paddingHorizontal: 16,
              paddingTop: 18,
              paddingBottom: 14,
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                alignSelf: 'flex-start',
                marginBottom: 12,
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
              sourceLanguage={post.source_language}
              numberOfLines={4}
              textStyle={{ color: colors.textMain, fontSize: 16, fontWeight: '700', lineHeight: 22 }}
            />
          </View>
        )}
      </Pressable>

      <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
        <Pressable onPress={openDetail}>
          <TranslatedText
            originalText={post.title}
            translatedText={post.translated_title}
            sourceLanguage={post.source_language}
            numberOfLines={2}
            textStyle={{
              fontSize: 14.5,
              fontWeight: '700',
              lineHeight: 20,
              color: colors.textMain,
              marginBottom: 8,
            }}
          />

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
              style={{ marginLeft: 8, flex: 1, fontSize: 11.5, color: colors.textMuted }}
            >
              {post.author.display_name}
            </Text>
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
        </View>
      </View>
    </View>
  );
}
