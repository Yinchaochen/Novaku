import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { colors, shadows } from '../../theme/tokens';
import { useLanguage } from '../../context/LanguageContext';
import { cardMediaFit } from '../../lib/cardAspect';
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
// keeps a masonry column from looking like a table. Cards WITH a picture
// reserve a ratio instead — see cardAspectFor.

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

function Avatar({
  name,
  avatarUrl,
  recyclingKey,
}: {
  name: string;
  avatarUrl?: string | null;
  recyclingKey: string;
}) {
  const resolvedAvatarUrl = resolveMediaUrl(avatarUrl);

  if (resolvedAvatarUrl) {
    return (
      <Image
        source={resolvedAvatarUrl}
        // See the cover image below: a recycled cell keeps the previous
        // avatar on screen until this one loads unless the key says the row
        // now belongs to somebody else.
        recyclingKey={recyclingKey}
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
  // Decided before the first render and never revised. Sizing from onLoad was
  // correct about the picture and wrong about the list: a card that changes
  // height after layout shoves every card below it in a masonry column, and
  // with images arriving at different moments the whole feed twitches while
  // you scroll. A slot is reserved now, from what we already know, and the
  // image is fitted into it.
  const media = cardMediaFit(post.media_items[0], post.id);
  const showOfficialChip = isOfficialAuthor(post.author);
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
        // Xiaohongshu leaves 20px between stacked cards and 4-6px between the
        // columns — tight across, generous down. We had it the other way
        // round: an 8dp gutter and a 6dp gap, so cards nearly touched
        // vertically while the shadow of each one bled into the next.
        marginBottom: 10,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        ...shadows.card,
        // shadows.card paints ~38dp below a card (radius 24, offset 14) into
        // what used to be a 6dp gap, so every pair of neighbours shared one
        // smudge and the grid read as fogged rather than as cards. Kept as a
        // card-local override: the token is right for the big surfaces it was
        // drawn for, and wrong at this size and this spacing.
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        elevation: 2,
      }}
    >
      {/* Long press replaces the per-card "..." button: the menu holds one
          rarely-used action, and in this column its 35dp cost was paid by
          the author's name on every single card. */}
      <Pressable onPress={openDetail} onLongPress={openCardActions}>
        {post.media_items[0] ? (
          <View>
            <Image
              source={
                resolveMediaUrl(post.media_items[0].thumb_url ?? post.media_items[0].media_url) ??
                post.media_items[0].media_url
              }
              // FlashList rebinds one card view to a different post instead of
              // mounting a new one, and expo-image's default on a changed
              // source is to hold the old picture until the new one decodes —
              // correct for a URL swap on the same card, wrong here, where it
              // showed post B wearing post A's photo until the network caught
              // up. The key tells the view the slot changed hands, so it
              // clears first. D-078 reserved the slot's height; this keeps the
              // slot's *content* honest while it fills.
              recyclingKey={post.id}
              // The slot is always portrait-ish so the feed has one rhythm;
              // `contain` is what keeps that from becoming a lie about a wide
              // poster, which is drawn whole inside the slot instead of being
              // trimmed to it.
              contentFit={media.fit}
              transition={120}
              style={{ width: '100%', aspectRatio: media.aspect, backgroundColor: '#1F1B18' }}
            />
            {showOfficialChip ? (
              // The chip used to sit beside the author's name. In a 148dp
              // column it never fit: it does not shrink, so the name — which
              // does — collapsed to nothing and every seeded card read
              // ".. Editor" with no author at all. Moving it onto the picture
              // gives the name the row back and makes the disclosure larger,
              // not smaller, which is the direction D-065 cares about.
              // Bottom-left: top-left is the moderation chip, bottom-right the
              // video duration.
              <View pointerEvents="none" style={{ position: 'absolute', left: 8, bottom: 8 }}>
                <OfficialChip />
              </View>
            ) : null}
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
              // A square, the same slot a picture would have had. It was 96dp
              // — sized to the words — which made a text post the shortest
              // card in the feed by a wide margin, and pitch that swings is
              // what a reader feels as restlessness. Xiaohongshu does the same
              // thing: their text posts are rendered INTO the cover slot and
              // cost exactly what a photo post costs.
              //
              // Square rather than the full 0.86 slot: the panel earns its
              // height with words, and five lines of guide fill a square
              // without turning into an empty billboard.
              aspectRatio: 1,
              backgroundColor: typeColor.bg,
              paddingHorizontal: 12,
              paddingTop: 12,
              paddingBottom: 12,
              // Chip at the top, words at the bottom. Bottom-aligning both
              // left the upper third of a square panel empty, which reads as a
              // card that has not finished loading rather than as a design.
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View
                style={{
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
              {/* A text post has no picture to carry the chip, so it rides
                  beside the type label instead — still on the card face, still
                  a word, never absent. */}
              {showOfficialChip ? <OfficialChip /> : null}
            </View>
            <TranslatedText
              originalText={post.body}
              translatedText={post.translated_body}
              sourceLanguage={post.body_source_language ?? post.source_language}
              // Five, because the panel is a square now and three lines left
              // most of it empty. More of the guide on the card is also the
              // only compensation a text post gets for having no picture.
              numberOfLines={5}
              showToggle={false}
              // Was 16/bold: the body then outweighed the title printed under
              // it, so a reader met the same post twice, louder first.
              textStyle={{ color: colors.textBrown, fontSize: 13, fontWeight: '400', lineHeight: 18 }}
            />
          </View>
        )}
      </Pressable>

      <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
        <Pressable onPress={openDetail} onLongPress={openCardActions}>
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
              showToggle={false}
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

        {/* Three fixed-width things plus a name do not fit in a 148dp column:
            the avatar, the Editor chip, the heart with its count and the "..."
            menu together ask for more than the column has, and the name is the
            only one that shrinks — so it was the one that vanished. The chip
            moved to the picture, the menu moved to a long press on the card,
            and a count of zero is not printed. What is left is what the name
            needs. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            style={{ marginRight: 8, flex: 1, flexDirection: 'row', alignItems: 'center' }}
            onPress={openAuthorProfile}
            hitSlop={4}
          >
            <Avatar
              name={post.author.display_name}
              avatarUrl={post.author.avatar_url}
              recyclingKey={post.author.id}
            />
            <Text
              numberOfLines={1}
              style={{ marginLeft: 8, flexShrink: 1, fontSize: 11.5, color: colors.textMuted }}
            >
              {post.author.display_name}
            </Text>
            {post.author.is_verified ? <VerifiedBadge size={12} /> : null}
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
            {/* A wall of "0" is a report on how empty the room is. The heart
                still says the action is available; the number arrives when
                there is one. */}
            {post.helpful_count > 0 ? (
              <Text style={{ marginLeft: 4, fontSize: 11.5, color: colors.textMuted }}>
                {post.helpful_count}
              </Text>
            ) : null}
          </Pressable>
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
