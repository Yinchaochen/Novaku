import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GradientButton } from '../../../components/GradientButton';
import { IconCircleButton } from '../../../components/IconCircleButton';
import { LinkText } from '../../../components/LinkText';
import { PageHeader } from '../../../components/PageHeader';
import { Pill } from '../../../components/Pill';
import { Screen } from '../../../components/Screen';
import { SurfaceCard } from '../../../components/SurfaceCard';
import { useLanguage } from '../../../context/LanguageContext';
import {
  type BuddyPost,
  useBuddyPost,
  useChatByBuddyPost,
  useDeleteBuddyPost,
} from '../../../features/buddyPosts/useBuddyPosts';
import { resolveMediaUrl } from '../../../lib/media';
import { reportToSentry } from '../../../lib/sentry';
import { useSearchIntentStore } from '../../../store/searchIntentStore';
import { colors, radius, spacing, typography } from '../../../theme/tokens';

function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return '';
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatTime(post: BuddyPost, langCode: string): string {
  try {
    if (post.type === 'companion' && post.available_at && post.available_until) {
      const start = new Date(post.available_at);
      const end = new Date(post.available_until);
      const date = new Intl.DateTimeFormat(langCode, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const time = new Intl.DateTimeFormat(langCode, { hour: 'numeric', minute: '2-digit' });
      return `${date.format(start)} · ${time.format(start)}–${time.format(end)}`;
    }
    if (post.type === 'errand_carry' && post.depart_date && post.return_date) {
      const date = new Intl.DateTimeFormat(langCode, { month: 'long', day: 'numeric' });
      return `${date.format(new Date(post.depart_date))} → ${date.format(new Date(post.return_date))}`;
    }
  } catch {
    return '';
  }
  return '';
}

export default function BuddyPostDetailScreen() {
  const { t, langCode } = useLanguage();
  const params = useLocalSearchParams<{ id: string }>();
  const postId = typeof params.id === 'string' ? params.id : null;
  const query = useBuddyPost(postId);
  const startChat = useChatByBuddyPost();
  const deletePost = useDeleteBuddyPost();
  const setOpenIntent = useSearchIntentStore((state) => state.setOpenIntent);
  const post = query.data;

  const handleContact = async () => {
    if (!post) return;
    try {
      const conversation = await startChat.mutateAsync(post.id);
      setOpenIntent({ conversationId: conversation.id, origin: 'buddy_post' });
      router.push('/(tabs)/social' as never);
    } catch (error) {
      reportToSentry(error, { source: 'buddy.detail.contact', postId: post.id });
      Alert.alert(t.common.error, t.common.network_error);
    }
  };

  const handleDelete = () => {
    if (!post) return;
    Alert.alert(t.buddy.delete_post_confirm, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost.mutateAsync(post.id);
            router.back();
          } catch (error) {
            reportToSentry(error, { source: 'buddy.detail.delete', postId: post.id });
            Alert.alert(t.common.error, t.common.network_error);
          }
        },
      },
    ]);
  };

  const header = (
    <PageHeader
      title={post ? t.buddy[`cat_${post.category}` as const] : t.buddy.post_detail_title}
      trailing={(
        <View style={styles.headerActions}>
          {post?.is_owner ? (
            <IconCircleButton accessibilityLabel={t.buddy.delete_post_confirm} onPress={handleDelete} size={42}>
              <Ionicons name="trash-outline" size={19} color={colors.brandCoral} />
            </IconCircleButton>
          ) : null}
          <IconCircleButton accessibilityLabel={t.common.back} onPress={() => router.back()} size={42}>
            <Ionicons name="chevron-back" size={21} color={colors.textBrown} />
          </IconCircleButton>
        </View>
      )}
    />
  );

  if (query.isLoading) {
    return (
      <Screen header={header} contentClassName="items-center justify-center" testID="screen.buddy.detail.loading">
        <ActivityIndicator size="large" color={colors.brandCoral} />
      </Screen>
    );
  }

  if (query.isError || !post) {
    return (
      <Screen header={header} contentClassName="items-center justify-center px-8" testID="screen.buddy.detail.error">
        <Ionicons name="alert-circle-outline" size={58} color={colors.lavenderSoft} />
        <Text style={styles.errorText}>{t.buddy.errors.post_not_found}</Text>
      </Screen>
    );
  }

  const avatar = resolveMediaUrl(post.author.avatar_url);
  const mediaItems = post.media_items ?? [];
  const priceLabel = formatPrice(post.price_cents, post.currency);
  const timeLabel = formatTime(post, langCode);
  const acceptedLocation = [post.accepted_city, post.accepted_country].filter(Boolean).join(', ');
  const routeLabel = post.type === 'errand_carry'
    ? `${post.accepted_city ?? post.from_city ?? ''} → ${post.to_city ?? ''}`
    : post.from_city ?? '';

  const priceText = post.pricing_mode === 'free'
    ? t.buddy.field_price_free
    : post.pricing_mode === 'negotiable' && post.price_cents === 0
      ? t.buddy.field_price_negotiable
      : priceLabel;

  return (
    <Screen header={header} testID="screen.buddy.detail">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {mediaItems.length > 0 ? (
          <SurfaceCard padding={0} style={styles.gallery}>
            <Image
              source={resolveMediaUrl(mediaItems[0].media_url) ?? mediaItems[0].media_url}
              contentFit="cover"
              transition={160}
              style={styles.heroImage}
            />
            {mediaItems.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>
                {mediaItems.map((item) => (
                  <Image
                    key={`${item.media_url}-${item.sort_order}`}
                    source={resolveMediaUrl(item.media_url) ?? item.media_url}
                    contentFit="cover"
                    style={styles.thumbnail}
                  />
                ))}
              </ScrollView>
            ) : null}
          </SurfaceCard>
        ) : null}

        <Pressable
          onPress={() => router.push({ pathname: '/users/[id]', params: { id: post.author.id } })}
        >
          <SurfaceCard style={styles.authorCard}>
            {avatar ? (
              <Image source={avatar} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{post.author.display_name.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.authorCopy}>
              <Text style={styles.authorName}>{post.author.display_name}</Text>
              <Text style={styles.authorMeta} numberOfLines={1}>
                #{post.author.display_id}
                {post.author.age ? ` · ${post.author.age}` : ''}
                {post.author.city ? ` · ${post.author.city}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </SurfaceCard>
        </Pressable>

        <SurfaceCard style={styles.copyCard}>
          <View style={styles.pillRow}>
            <Pill label={t.buddy[`type_${post.type}` as const]} tone="coral" />
            <Pill label={t.buddy[`cat_${post.category}` as const]} tone="lavender" />
          </View>
          {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
          <LinkText style={styles.body} text={post.body} />
        </SurfaceCard>

        <SurfaceCard style={styles.detailCard}>
          {acceptedLocation ? (
            <View style={styles.detailRow}>
              <Ionicons name="earth-outline" size={20} color={colors.brandCoral} />
              <View style={styles.detailCopy}>
                <Text style={styles.detailLabel}>{t.buddy.accepted_location_label}</Text>
                <Text style={styles.detailValue}>{acceptedLocation}</Text>
              </View>
            </View>
          ) : null}
          {routeLabel ? (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={colors.lavender} />
              <View style={styles.detailCopy}>
                <Text style={styles.detailLabel}>{t.buddy.section_route}</Text>
                <Text style={styles.detailValue}>{routeLabel}</Text>
              </View>
            </View>
          ) : null}
          {timeLabel ? (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={colors.brandPeach} />
              <View style={styles.detailCopy}>
                <Text style={styles.detailLabel}>{t.buddy.field_when}</Text>
                <Text style={styles.detailValue}>{timeLabel}</Text>
              </View>
            </View>
          ) : null}
          {post.type === 'errand_carry' && post.accepts_shipping ? (
            <View style={styles.detailRow}>
              <Ionicons name="cube-outline" size={20} color={colors.success} />
              <Text style={styles.detailValue}>{t.buddy.field_accepts_shipping}</Text>
            </View>
          ) : null}
        </SurfaceCard>

        <SurfaceCard tone="cream" style={styles.priceCard}>
          <Text style={styles.detailLabel}>{t.buddy.field_price}</Text>
          <Text style={styles.price}>{priceText}</Text>
          {post.pricing_mode === 'negotiable' && post.price_cents > 0 ? (
            <Pill label={t.buddy.field_price_negotiable} tone="neutral" />
          ) : null}
        </SurfaceCard>
      </ScrollView>

      {!post.is_owner ? (
        <View style={styles.footer}>
          <GradientButton
            label={t.buddy.contact_button}
            loading={startChat.isPending}
            fullWidth
            size="lg"
            leadingIcon={<Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />}
            onPress={() => void handleContact()}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  gallery: {
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 310,
    backgroundColor: colors.bgWarm,
  },
  thumbnails: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  thumbnail: {
    width: 74,
    height: 74,
    borderRadius: radius.md,
    backgroundColor: colors.bgWarm,
  },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE6EA',
  },
  avatarLetter: {
    ...typography.subheading,
    color: colors.brandCoral,
  },
  authorCopy: {
    flex: 1,
  },
  authorName: {
    ...typography.subheading,
    color: colors.textMain,
  },
  authorMeta: {
    ...typography.caption,
    marginTop: 2,
    color: colors.textMuted,
  },
  copyCard: {
    gap: spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.textMain,
  },
  body: {
    ...typography.body,
    color: colors.textBrown,
  },
  detailCard: {
    gap: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    ...typography.overline,
    color: colors.textMuted,
  },
  detailValue: {
    ...typography.bodyStrong,
    flex: 1,
    color: colors.textBrown,
  },
  priceCard: {
    gap: spacing.sm,
  },
  price: {
    ...typography.title,
    color: colors.brandCoral,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
    backgroundColor: 'rgba(255,248,241,0.96)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  errorText: {
    ...typography.bodyStrong,
    marginTop: spacing.lg,
    color: colors.textBrown,
    textAlign: 'center',
  },
});
