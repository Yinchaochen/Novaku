import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { BuddyFormField } from '../../components/buddy/BuddyFormField';
import { BuddyPhotoPicker } from '../../components/buddy/BuddyPhotoPicker';
import { BuddyPriceField } from '../../components/buddy/BuddyPriceField';
import { DateRangePicker } from '../../components/datetime/DateRangePicker';
import { DateTimeRangePicker } from '../../components/datetime/DateTimeRangePicker';
import { GradientButton } from '../../components/GradientButton';
import { BuddyGuideAnchor } from '../../components/guide/BuddyGuideAnchor';
import { BuddyGuideSpotlight } from '../../components/guide/BuddyGuideSpotlight';
import { IconCircleButton } from '../../components/IconCircleButton';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { SectionLabel } from '../../components/SectionLabel';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useLanguage } from '../../context/LanguageContext';
import { measureBuddyTarget } from '../../features/guide/buddyGuide';
import { useBuddyGuide } from '../../features/guide/useBuddyGuide';
import {
  type BuddyPostCategory,
  type BuddyPostMedia,
  type BuddyPostType,
  useCreateBuddyPost,
  useUploadBuddyMedia,
} from '../../features/buddyPosts/useBuddyPosts';
import {
  isBuddyPricingComplete,
  parseBuddyPriceCents,
  type BuddyPricingMode,
} from '../../features/buddyPosts/pricing';
import { compressImageForUpload } from '../../lib/imageCompression';
import { mapWithConcurrency } from '../../lib/mapWithConcurrency';
import { reportToSentry } from '../../lib/sentry';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, spacing, typography } from '../../theme/tokens';

const MAX_WISH_PHOTOS = 5;
const MEDIA_UPLOAD_CONCURRENCY = 2;

const CATEGORY_OPTIONS: { id: BuddyPostCategory; type: BuddyPostType[] }[] = [
  { id: 'anmeldung', type: ['companion'] },
  { id: 'medical', type: ['companion'] },
  { id: 'shopping', type: ['companion'] },
  { id: 'meal', type: ['companion'] },
  { id: 'walking', type: ['companion'] },
  { id: 'language_help', type: ['companion'] },
  { id: 'errand_carry', type: ['errand_carry'] },
  { id: 'other', type: ['companion', 'errand_carry'] },
];

function formatDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function BuddyComposeScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ type?: string }>();
  const user = useAuthStore((state) => state.user);
  const createPost = useCreateBuddyPost();
  const uploadMedia = useUploadBuddyMedia();
  const postType: BuddyPostType = params.type === 'errand_carry' ? 'errand_carry' : 'companion';
  const isWish = postType === 'errand_carry';

  const chapter = isWish ? 'wish' : 'companion';
  const guide = useBuddyGuide(chapter);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);

  // Wish posts have no category picker: they are always 'errand_carry'.
  const [category, setCategory] = useState<BuddyPostCategory>(isWish ? 'errand_carry' : 'meal');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priceText, setPriceText] = useState('');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [priceMode, setPriceMode] = useState<BuddyPricingMode>('fixed');
  const [companionRange, setCompanionRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [carryRange, setCarryRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [serviceCity, setServiceCity] = useState(user?.city ?? '');
  const [whereToBuy, setWhereToBuy] = useState('');
  const [destinationCity, setDestinationCity] = useState(user?.city ?? '');
  const [acceptsShipping, setAcceptsShipping] = useState(true);
  const [mediaItems, setMediaItems] = useState<BuddyPostMedia[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const parsedPriceCents = useMemo(
    () => parseBuddyPriceCents(priceText, priceMode),
    [priceMode, priceText],
  );
  const priceDecided = isBuddyPricingComplete(priceMode, parsedPriceCents);
  const visibleCategories = CATEGORY_OPTIONS.filter((option) => option.type.includes(postType));
  const canSubmit = useMemo(() => {
    if (!body.trim() || !priceDecided || isUploading) return false;
    if (!isWish) {
      return Boolean(title.trim() && companionRange.start && companionRange.end && serviceCity.trim());
    }
    return Boolean(carryRange.start && carryRange.end && whereToBuy.trim() && destinationCity.trim());
  }, [
    body,
    carryRange,
    companionRange,
    destinationCity,
    isUploading,
    isWish,
    priceDecided,
    serviceCity,
    title,
    whereToBuy,
  ]);

  const pickPhotos = async () => {
    const remaining = MAX_WISH_PHOTOS - mediaItems.length;
    if (remaining <= 0) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });
      if (result.canceled) return;

      setIsUploading(true);
      const uploaded = await mapWithConcurrency(
        result.assets.slice(0, remaining),
        MEDIA_UPLOAD_CONCURRENCY,
        async (asset) => {
          const compressed = await compressImageForUpload({
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            fileName: asset.fileName,
            fileSize: asset.fileSize,
          });
          return uploadMedia.mutateAsync(compressed);
        },
      );
      setMediaItems((current) => [...current, ...uploaded].slice(0, MAX_WISH_PHOTOS));
    } catch (error) {
      reportToSentry(error, { source: 'buddy.wish.upload_media' });
      Alert.alert(t.common.error, t.buddy.compose_upload_failed);
    } finally {
      setIsUploading(false);
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await createPost.mutateAsync({
        type: postType,
        category,
        // A wish is described by one text block — no separate headline.
        title: isWish ? '' : title.trim(),
        body: body.trim(),
        price_cents: parsedPriceCents ?? 0,
        pricing_mode: priceMode,
        currency,
        available_at: !isWish && companionRange.start ? companionRange.start.toISOString() : undefined,
        available_until: !isWish && companionRange.end ? companionRange.end.toISOString() : undefined,
        depart_date: isWish && carryRange.start ? formatDateOnly(carryRange.start) : undefined,
        return_date: isWish && carryRange.end ? formatDateOnly(carryRange.end) : undefined,
        from_city: isWish ? whereToBuy.trim() : serviceCity.trim(),
        to_city: isWish ? destinationCity.trim() : undefined,
        accepted_city: isWish ? whereToBuy.trim() : undefined,
        accepts_shipping: isWish ? acceptsShipping : false,
        media_items: isWish
          ? mediaItems.map((item) => ({ media_url: item.media_url, mime_type: item.mime_type }))
          : undefined,
      });
      router.back();
    } catch (error) {
      const response = (error as {
        response?: { data?: { error?: { code?: string } }; status?: number };
      }).response;
      reportToSentry(error, { source: 'buddy.create', code: response?.data?.error?.code });
      const code = response?.data?.error?.code;
      let message = t.common.error;
      if (code === 'buddy.duplicate_post') message = t.buddy.errors.duplicate_post;
      else if (code === 'buddy.publish_banned') message = t.buddy.errors.publish_banned;
      else if (code === 'buddy.moderation_rejected') message = t.buddy.errors.moderation_rejected;
      else if (response?.status === undefined) message = t.common.network_error;
      else if (response.status >= 500) message = t.common.server_error;
      Alert.alert(t.common.error, message);
    }
  };

  // The walkthrough points at the real Post button, so a guided tap opens a
  // confirm card first — the tour never publishes on the user's behalf.
  const guidedPublishStep = isWish ? 'wish_publish' : 'companion_publish';
  const handlePostPress = () => {
    if (guide.step === guidedPublishStep) {
      guide.requestPublishConfirm();
      return;
    }
    void submit();
  };

  // Keep the highlighted control on screen: the composer is longer than a
  // viewport, so a step whose target scrolled away would spotlight nothing.
  useEffect(() => {
    const step = guide.step;
    if (!step) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const rect = await measureBuddyTarget(step);
      if (cancelled || !rect) return;
      const topBand = 150;
      const bottomBand = 420;
      if (rect.y >= topBand && rect.y <= bottomBand) return;
      scrollRef.current?.scrollTo({
        y: Math.max(0, scrollOffset.current + rect.y - topBand),
        animated: true,
      });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [guide.step]);

  const header = (
    <PageHeader
      title={isWish ? t.buddy.compose_wish_title : t.buddy.compose_companion_title}
      subtitle={isWish ? t.buddy.compose_wish_subtitle : t.buddy.compose_companion_subtitle}
      trailing={(
        <View style={styles.headerActions}>
          <View testID="buddy.compose.guide-entry">
            <IconCircleButton
              accessibilityLabel={t.buddy_guide.entry_label}
              onPress={guide.restart}
              size={42}
            >
              <Ionicons name="help" size={20} color={colors.textBrown} />
            </IconCircleButton>
          </View>
          <IconCircleButton
            accessibilityLabel={t.common.back}
            onPress={() => router.back()}
            size={42}
          >
            <Ionicons name="close" size={20} color={colors.textBrown} />
          </IconCircleButton>
        </View>
      )}
    />
  );

  if (!user?.gender) {
    return (
      <Screen header={header} contentClassName="items-center justify-center px-8" testID="screen.buddy.compose.gender">
        <SurfaceCard style={styles.genderCard}>
          <Ionicons name="person-circle-outline" size={58} color={colors.lavender} />
          <Text style={styles.genderText}>{t.buddy.errors.gender_required}</Text>
          <GradientButton
            label={t.profile.edit_profile_action}
            onPress={() => router.push('/(tabs)/profile' as never)}
          />
        </SurfaceCard>
      </Screen>
    );
  }

  return (
    <Screen header={header} keyboard background="default" testID="screen.buddy.compose">
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollOffset.current = event.nativeEvent.contentOffset.y;
        }}
      >
        {isWish ? (
          <View style={styles.section}>
            <SectionLabel tone="coral">{t.buddy.section_photos}</SectionLabel>
            <BuddyGuideAnchor step="wish_photos">
              <BuddyPhotoPicker
                items={mediaItems}
                maxItems={MAX_WISH_PHOTOS}
                addLabel={t.buddy.photo_add}
                emptyTitle={t.buddy.photo_empty_title}
                emptyHint={t.buddy.photo_empty_hint}
                removeLabel={t.buddy.photo_remove}
                isUploading={isUploading}
                onAdd={() => void pickPhotos()}
                onRemove={(index) => setMediaItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
              />
            </BuddyGuideAnchor>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionLabel>{t.buddy.section_request}</SectionLabel>
          <SurfaceCard style={styles.formCard}>
            {isWish ? (
              <BuddyGuideAnchor step="wish_description">
                <BuddyFormField
                  label={t.buddy.field_description}
                  hint={t.buddy.field_description_hint}
                  value={body}
                  onChangeText={setBody}
                  placeholder={t.buddy.compose_description_placeholder}
                  multiline
                  maxLength={2500}
                />
              </BuddyGuideAnchor>
            ) : (
              <>
                <BuddyGuideAnchor step="companion_category">
                  <Text style={styles.fieldLabel}>{t.buddy.compose_category_label}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {visibleCategories.map((option) => (
                      <Pressable key={option.id} onPress={() => setCategory(option.id)}>
                        <Pill
                          label={t.buddy[`cat_${option.id}` as const]}
                          tone={category === option.id ? 'coral' : 'cream'}
                          size="md"
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                </BuddyGuideAnchor>
                <BuddyGuideAnchor step="companion_title">
                  <BuddyFormField
                    label={t.buddy.field_title}
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t.buddy.compose_title_placeholder}
                    maxLength={160}
                  />
                </BuddyGuideAnchor>
                <BuddyGuideAnchor step="companion_body">
                  <BuddyFormField
                    label={t.buddy.field_body}
                    value={body}
                    onChangeText={setBody}
                    placeholder={t.buddy.compose_body_placeholder}
                    multiline
                    maxLength={2500}
                  />
                </BuddyGuideAnchor>
              </>
            )}
            <Text style={styles.counter}>{body.length} / 2500</Text>
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <SectionLabel tone="lavender">{isWish ? t.buddy.section_fulfilment : t.buddy.section_route}</SectionLabel>
          <SurfaceCard style={styles.formCard}>
            <BuddyGuideAnchor step={isWish ? 'wish_dates' : 'companion_when'}>
              <Text style={styles.fieldLabel}>{t.buddy.field_when}</Text>
              {isWish ? (
                <DateRangePicker
                  value={carryRange}
                  onChange={setCarryRange}
                  placeholder={t.buddy.compose_pick_dates}
                  minDate={new Date()}
                />
              ) : (
                <DateTimeRangePicker
                  value={companionRange}
                  onChange={setCompanionRange}
                  placeholder={t.buddy.compose_pick_time}
                  minDate={new Date()}
                />
              )}
            </BuddyGuideAnchor>

            {isWish ? (
              <>
                <BuddyGuideAnchor step="wish_where_to_buy">
                  <BuddyFormField
                    label={t.buddy.field_where_to_buy}
                    hint={t.buddy.field_where_to_buy_hint}
                    value={whereToBuy}
                    onChangeText={setWhereToBuy}
                    placeholder={t.buddy.compose_where_to_buy_placeholder}
                    maxLength={100}
                  />
                </BuddyGuideAnchor>
                <BuddyGuideAnchor step="wish_deliver_to">
                  <BuddyFormField
                    label={t.buddy.field_destination_city}
                    hint={t.buddy.field_destination_city_hint}
                    value={destinationCity}
                    onChangeText={setDestinationCity}
                    placeholder={t.buddy.compose_destination_city_placeholder}
                  />
                </BuddyGuideAnchor>
                <BuddyGuideAnchor step="wish_shipping">
                  <View style={styles.switchRow}>
                    <View style={styles.switchCopy}>
                      <Ionicons name="cube-outline" size={20} color={colors.brandCoral} />
                      <Text style={styles.switchLabel}>{t.buddy.field_accepts_shipping}</Text>
                    </View>
                    <Switch
                      value={acceptsShipping}
                      onValueChange={setAcceptsShipping}
                      trackColor={{ true: colors.brandCoral, false: colors.lineWarm }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </BuddyGuideAnchor>
              </>
            ) : (
              <BuddyGuideAnchor step="companion_city">
                <BuddyFormField
                  label={t.buddy.field_where_from}
                  value={serviceCity}
                  onChangeText={setServiceCity}
                  placeholder={t.buddy.compose_city_placeholder}
                />
              </BuddyGuideAnchor>
            )}
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <SectionLabel tone="coral">{t.buddy.field_price}</SectionLabel>
          <BuddyGuideAnchor step={isWish ? 'wish_price' : 'companion_price'}>
            <BuddyPriceField
              priceText={priceText}
              currency={currency}
              mode={priceMode}
              isComplete={priceDecided}
              amountPlaceholder={t.buddy.compose_price_placeholder}
              fixedLabel={t.buddy.field_price}
              freeLabel={t.buddy.compose_price_free_label}
              negotiableLabel={t.buddy.compose_price_negotiable_label}
              onPriceTextChange={setPriceText}
              onCurrencyChange={setCurrency}
              onModeChange={setPriceMode}
            />
          </BuddyGuideAnchor>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <BuddyGuideAnchor step={guidedPublishStep}>
          <GradientButton
            label={t.buddy.compose_button}
            loading={createPost.isPending}
            disabled={!canSubmit}
            fullWidth
            size="lg"
            leadingIcon={<Ionicons name={isWish ? 'sparkles' : 'people'} size={19} color="#FFFFFF" />}
            onPress={handlePostPress}
          />
        </BuddyGuideAnchor>
      </View>

      <BuddyGuideSpotlight
        chapter={chapter}
        onConfirmPublish={() => {
          guide.end();
          void submit();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  formCard: {
    gap: spacing.md,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  counter: {
    ...typography.caption,
    marginTop: -spacing.sm,
    color: colors.textSubtle,
    textAlign: 'right',
  },
  chipRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  switchRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    backgroundColor: '#FFF4E8',
    paddingHorizontal: spacing.lg,
  },
  switchCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: {
    ...typography.bodyStrong,
    color: colors.textBrown,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
    backgroundColor: 'rgba(255,248,241,0.96)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  genderCard: {
    maxWidth: 380,
    alignItems: 'center',
    gap: spacing.lg,
  },
  genderText: {
    ...typography.bodyStrong,
    color: colors.textBrown,
    textAlign: 'center',
  },
});
