import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { colors } from '../../theme/tokens';
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
import { PostCover } from '../../components/community/PostCover';
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
  // Only the cover's internal grid needs this — its height is pinned by
  // aspectRatio either way, so measuring the width can never reflow the card
  // and D-078's rule is untouched. The seed is the real column width on a
  // 393dp phone, so the first frame is already close.
  const [coverWidth, setCoverWidth] = useState(184.5);

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
        // No plate, no shadow — the picture sits on the page and the words sit
        // under it (D-088, lisum's call). Measured on Xiaohongshu: the gap
        // between two cards and the background behind a card's own text are
        // the same white, so a post is bounded by its picture and by nothing
        // else. Ours was a white rectangle plus a shadow on a cream page: two
        // closed contours per post, twelve outlines on a screen of six.
        //
        // This costs zero height. What it buys is the twenty dp of width that
        // the plate's own padding was taking off every byline, and one edge
        // per card instead of three.
        //
        // Xiaohongshu leaves 20px between stacked cards and 4-6px between the
        // columns — tight across, generous down. We had it the other way
        // round: an 8dp gutter and a 6dp gap.
        marginBottom: 10,
      }}
    >
      {/* Long press replaces the per-card "..." button: the menu holds one
          rarely-used action, and in this column its 35dp cost was paid by
          the author's name on every single card. */}
      <Pressable
        onPress={openDetail}
        onLongPress={openCardActions}
        // The card's one and only outline. 12 rather than Xiaohongshu's ~4:
        // their product is square-cornered throughout and ours is not, and
        // dropping the plate is meant to remove an edge, not to restyle the
        // brand.
        style={{ borderRadius: 12, overflow: 'hidden' }}
      >
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
              style={{
                width: '100%',
                aspectRatio: media.aspect,
                // Near-black is right for a picture that will cover the slot —
                // it is the dark moment before the image arrives, not a
                // surface anyone sees afterwards. A `contain` picture never
                // covers the slot, so that colour would become permanent
                // letterbox bars around every wide event poster. Matting a
                // poster on warm paper is the point; matting it in black is
                // an accident.
                backgroundColor: media.fit === 'contain' ? colors.bgWarmDeep : '#1F1B18',
              }}
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
          // A designed cover, not a tinted box with the body poured into it.
          // The square is the same slot a picture would have had, so a text
          // post costs exactly what a photo post costs and the feed keeps one
          // rhythm — which is what Xiaohongshu does, and why their text notes
          // do not read as posts that failed to have an image.
          <View onLayout={(event) => setCoverWidth(event.nativeEvent.layout.width)}>
            <PostCover post={post} width={coverWidth} />
            {showOfficialChip ? (
              // Bottom-left, exactly where it sits on a photo cover. The chip
              // used to ride beside the type pill, which only existed because
              // a text post had nowhere else to put it.
              <View pointerEvents="none" style={{ position: 'absolute', left: 8, bottom: 8 }}>
                <OfficialChip />
              </View>
            ) : null}
          </View>
        )}
      </Pressable>

      {/* Aligned to the picture's edge, not inset from a plate that is no
          longer there. The 10dp of side padding existed to keep words off the
          white rectangle's corner; without it the byline row — the thing that
          was squeezing the author's name out — gets 20dp back. */}
      <View style={{ paddingHorizontal: 2, paddingTop: 10, paddingBottom: 0 }}>
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
              style={{ marginLeft: 8, flexShrink: 1, fontSize: 11.5, color: colors.textMutedOnCream }}
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
              color={post.viewer_marked_helpful ? colors.brandCoral : colors.textMutedOnCream}
            />
            {/* A wall of "0" is a report on how empty the room is. The heart
                still says the action is available; the number arrives when
                there is one. */}
            {post.helpful_count > 0 ? (
              <Text style={{ marginLeft: 4, fontSize: 11.5, color: colors.textMutedOnCream }}>
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
