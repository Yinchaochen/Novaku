import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { BuddyPhotoPicker } from '../../components/buddy/BuddyPhotoPicker';
import { BuddyPriceField } from '../../components/buddy/BuddyPriceField';
import { DateRangePicker } from '../../components/datetime/DateRangePicker';
import { DateTimeRangePicker } from '../../components/datetime/DateTimeRangePicker';
import { GradientButton } from '../../components/GradientButton';
import { IconCircleButton } from '../../components/IconCircleButton';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';
import { SectionLabel } from '../../components/SectionLabel';
import { SurfaceCard } from '../../components/SurfaceCard';
import { useLanguage } from '../../context/LanguageContext';
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
import { reportToSentry } from '../../lib/sentry';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, spacing, typography } from '../../theme/tokens';

const MAX_WISH_PHOTOS = 5;

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

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
  maxLength?: number;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  maxLength = 120,
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={[styles.input, multiline ? styles.bodyInput : null]}
      />
    </View>
  );
}

export default function BuddyComposeScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ type?: string }>();
  const user = useAuthStore((state) => state.user);
  const createPost = useCreateBuddyPost();
  const uploadMedia = useUploadBuddyMedia();
  const postType: BuddyPostType = params.type === 'errand_carry' ? 'errand_carry' : 'companion';
  const isWish = postType === 'errand_carry';

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
  const [acceptedCountry, setAcceptedCountry] = useState('');
  const [acceptedCity, setAcceptedCity] = useState('');
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
    if (!title.trim() || !body.trim() || !priceDecided || isUploading) return false;
    if (!isWish) return Boolean(companionRange.start && companionRange.end && serviceCity.trim());
    return Boolean(
      carryRange.start
      && carryRange.end
      && acceptedCountry.trim()
      && acceptedCity.trim()
      && destinationCity.trim(),
    );
  }, [
    acceptedCity,
    acceptedCountry,
    body,
    carryRange,
    companionRange,
    destinationCity,
    isUploading,
    isWish,
    priceDecided,
    serviceCity,
    title,
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
      const uploaded = await Promise.all(
        result.assets.slice(0, remaining).map(async (asset) => {
          const compressed = await compressImageForUpload({
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            fileName: asset.fileName,
          });
          return uploadMedia.mutateAsync(compressed);
        }),
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
        title: title.trim(),
        body: body.trim(),
        price_cents: parsedPriceCents ?? 0,
        pricing_mode: priceMode,
        currency,
        available_at: !isWish && companionRange.start ? companionRange.start.toISOString() : undefined,
        available_until: !isWish && companionRange.end ? companionRange.end.toISOString() : undefined,
        depart_date: isWish && carryRange.start ? formatDateOnly(carryRange.start) : undefined,
        return_date: isWish && carryRange.end ? formatDateOnly(carryRange.end) : undefined,
        from_city: isWish ? acceptedCity.trim() : serviceCity.trim(),
        to_city: isWish ? destinationCity.trim() : undefined,
        accepted_country: isWish ? acceptedCountry.trim() : undefined,
        accepted_city: isWish ? acceptedCity.trim() : undefined,
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

  const header = (
    <PageHeader
      title={isWish ? t.buddy.compose_wish_title : t.buddy.compose_companion_title}
      subtitle={isWish ? t.buddy.compose_wish_subtitle : t.buddy.compose_companion_subtitle}
      trailing={(
        <IconCircleButton
          accessibilityLabel={t.common.back}
          onPress={() => router.back()}
          size={42}
        >
          <Ionicons name="close" size={20} color={colors.textBrown} />
        </IconCircleButton>
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {isWish ? (
          <View style={styles.section}>
            <SectionLabel tone="coral">{t.buddy.section_photos}</SectionLabel>
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
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionLabel>{t.buddy.section_request}</SectionLabel>
          <SurfaceCard style={styles.formCard}>
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
            <FormField
              label={t.buddy.field_title}
              value={title}
              onChangeText={setTitle}
              placeholder={t.buddy.compose_title_placeholder}
              maxLength={160}
            />
            <FormField
              label={t.buddy.field_body}
              value={body}
              onChangeText={setBody}
              placeholder={t.buddy.compose_body_placeholder}
              multiline
              maxLength={2500}
            />
            <Text style={styles.counter}>{body.length} / 2500</Text>
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <SectionLabel tone="lavender">{isWish ? t.buddy.section_fulfilment : t.buddy.section_route}</SectionLabel>
          <SurfaceCard style={styles.formCard}>
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

            {isWish ? (
              <>
                <View style={styles.twoColumn}>
                  <View style={styles.column}>
                    <FormField
                      label={t.buddy.field_accepted_country}
                      value={acceptedCountry}
                      onChangeText={setAcceptedCountry}
                      placeholder={t.buddy.compose_country_placeholder}
                    />
                  </View>
                  <View style={styles.column}>
                    <FormField
                      label={t.buddy.field_accepted_city}
                      value={acceptedCity}
                      onChangeText={setAcceptedCity}
                      placeholder={t.buddy.compose_city_placeholder}
                    />
                  </View>
                </View>
                <FormField
                  label={t.buddy.field_destination_city}
                  value={destinationCity}
                  onChangeText={setDestinationCity}
                  placeholder={t.buddy.compose_destination_city_placeholder}
                />
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
              </>
            ) : (
              <FormField
                label={t.buddy.field_where_from}
                value={serviceCity}
                onChangeText={setServiceCity}
                placeholder={t.buddy.compose_city_placeholder}
              />
            )}
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <SectionLabel tone="coral">{t.buddy.field_price}</SectionLabel>
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
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <GradientButton
          label={t.buddy.compose_button}
          loading={createPost.isPending}
          disabled={!canSubmit}
          fullWidth
          size="lg"
          leadingIcon={<Ionicons name={isWish ? 'sparkles' : 'people'} size={19} color="#FFFFFF" />}
          onPress={() => void submit()}
        />
      </View>
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
  fieldWrap: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineWarm,
    backgroundColor: '#FFFBF7',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textMain,
    fontSize: 15,
  },
  bodyInput: {
    minHeight: 124,
    textAlignVertical: 'top',
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
  twoColumn: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  column: {
    flex: 1,
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
