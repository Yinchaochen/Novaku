import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateRangePicker } from '../../components/datetime/DateRangePicker';
import { DateTimeRangePicker } from '../../components/datetime/DateTimeRangePicker';
import { useLanguage } from '../../context/LanguageContext';
import {
  type BuddyPostCategory,
  type BuddyPostType,
  useCreateBuddyPost,
} from '../../features/buddyPosts/useBuddyPosts';
import { useAuthStore } from '../../store/authStore';

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

function formatDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BuddyComposeScreen() {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const create = useCreateBuddyPost();

  const [postType, setPostType] = useState<BuddyPostType>('companion');
  const [category, setCategory] = useState<BuddyPostCategory>('meal');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priceText, setPriceText] = useState('');
  const [currency, setCurrency] = useState('EUR');
  // null = user hasn't decided yet; 'free' = locked at 0; 'negotiable' = open
  // to chat. Negotiable still allows entering a starting amount.
  const [priceMode, setPriceMode] = useState<'free' | 'negotiable' | null>(null);

  const [companionRange, setCompanionRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [carryRange, setCarryRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [fromCity, setFromCity] = useState(user?.city ?? '');
  const [toCity, setToCity] = useState('');
  const [acceptsShipping, setAcceptsShipping] = useState(true);

  const visibleCategories = CATEGORY_OPTIONS.filter((c) => c.type.includes(postType));

  // Switch type → align category if current category isn't compatible
  const handleSwitchType = (next: BuddyPostType) => {
    setPostType(next);
    const compat = CATEGORY_OPTIONS.filter((c) => c.type.includes(next));
    if (!compat.some((c) => c.id === category)) {
      setCategory(next === 'errand_carry' ? 'errand_carry' : 'meal');
    }
  };

  const priceCents = useMemo(() => {
    if (priceMode === 'free') return 0;
    const cleaned = priceText.replace(/[^0-9.]/g, '');
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  }, [priceText, priceMode]);

  // User must explicitly pick Free / Negotiable, or type a fixed amount.
  const priceDecided = priceMode !== null || priceCents > 0;

  const canSubmit = useMemo(() => {
    if (title.trim().length === 0 || body.trim().length === 0) return false;
    if (!priceDecided) return false;
    if (postType === 'companion') {
      return Boolean(companionRange.start && companionRange.end);
    }
    return Boolean(carryRange.start && carryRange.end && fromCity.trim() && toCity.trim());
  }, [title, body, priceDecided, postType, companionRange, carryRange, fromCity, toCity]);

  if (!user?.gender) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color="#111111" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="person-circle-outline" size={56} color="#D1D5DB" />
          <Text className="mt-3 text-center text-[15px] font-semibold text-neutral-800">
            {t.buddy.errors.gender_required}
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/profile' as never)}
            className="mt-4 rounded-full bg-[#F47C7C] px-5 py-2.5"
          >
            <Text className="text-[14px] font-semibold text-white">{t.profile.edit_profile_action}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const submit = async () => {
    if (!canSubmit) return;
    // Map the local tri-state UI back to the backend's pricing_mode column.
    // priceMode null + a typed amount means the author picked a fixed price.
    const pricingMode: 'fixed' | 'free' | 'negotiable' =
      priceMode === 'free' ? 'free' : priceMode === 'negotiable' ? 'negotiable' : 'fixed';
    try {
      await create.mutateAsync({
        type: postType,
        category,
        title: title.trim(),
        body: body.trim(),
        price_cents: priceCents,
        pricing_mode: pricingMode,
        currency,
        available_at:
          postType === 'companion' && companionRange.start
            ? companionRange.start.toISOString()
            : undefined,
        available_until:
          postType === 'companion' && companionRange.end
            ? companionRange.end.toISOString()
            : undefined,
        depart_date:
          postType === 'errand_carry' && carryRange.start
            ? formatDateOnly(carryRange.start)
            : undefined,
        return_date:
          postType === 'errand_carry' && carryRange.end ? formatDateOnly(carryRange.end) : undefined,
        from_city: fromCity.trim() || undefined,
        to_city: postType === 'errand_carry' ? toCity.trim() : undefined,
        accepts_shipping: postType === 'errand_carry' ? acceptsShipping : false,
      });
      router.back();
    } catch (err) {
      const errBody = (err as { response?: { data?: { error?: { code?: string; message?: string } }; status?: number } }).response;
      const status = errBody?.status;
      const code = errBody?.data?.error?.code;
      const detail = errBody?.data?.error?.message;
      console.log('[buddy.create] error', { status, code, detail, raw: err });
      let message: string;
      if (code === 'buddy.duplicate_post') message = t.buddy.errors.duplicate_post;
      else if (code === 'buddy.publish_banned') message = t.buddy.errors.publish_banned;
      else if (code === 'buddy.moderation_rejected') message = t.buddy.errors.moderation_rejected;
      else if (status === undefined) message = t.common.network_error;
      else if (status >= 500) message = t.common.server_error;
      else message = t.common.error;
      Alert.alert(t.common.error, message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color="#111111" />
          </Pressable>
          <Text className="text-[16px] font-semibold text-black">{t.buddy.compose_title}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          {/* Type toggle */}
          <View className="mb-4 flex-row rounded-full bg-white p-1" style={{ borderWidth: 1, borderColor: '#E5E7EB' }}>
            {(['companion', 'errand_carry'] as BuddyPostType[]).map((tp) => (
              <Pressable
                key={tp}
                onPress={() => handleSwitchType(tp)}
                className="flex-1 items-center py-2.5"
                style={{ borderRadius: 999, backgroundColor: postType === tp ? '#F47C7C' : 'transparent' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: postType === tp ? '#FFF' : '#6B7280' }}>
                  {tp === 'companion' ? t.buddy.type_companion : t.buddy.type_errand_carry}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Category chips */}
          <Text className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
            {t.buddy.compose_category_label}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {visibleCategories.map((c) => {
              const active = category === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategory(c.id)}
                  className="mr-2 rounded-full px-3.5 py-2"
                  style={{
                    backgroundColor: active ? '#111827' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: active ? '#111827' : '#E5E7EB',
                  }}
                >
                  <Text
                    className="text-[12.5px] font-semibold"
                    style={{ color: active ? '#FFFFFF' : '#374151' }}
                  >
                    {t.buddy[`cat_${c.id}` as const]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Title */}
          <Text className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
            {t.buddy.field_title}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t.buddy.compose_title_placeholder}
            placeholderTextColor="#9CA3AF"
            maxLength={160}
            className="mb-4 rounded-2xl bg-white px-4 py-3 text-[15px] text-black"
            style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
          />

          {/* Body */}
          <Text className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
            {t.buddy.field_body}
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t.buddy.compose_body_placeholder}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={2500}
            className="mb-1 min-h-[120px] rounded-2xl bg-white px-4 py-3 text-[15px] text-black"
            style={{ borderWidth: 1, borderColor: '#E5E7EB', textAlignVertical: 'top' }}
          />
          <Text className="mb-4 text-right text-[11px] text-neutral-400">{body.length} / 2500</Text>

          {/* Time picker */}
          <Text className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
            {t.buddy.field_when}
          </Text>
          {postType === 'companion' ? (
            <DateTimeRangePicker
              value={companionRange}
              onChange={setCompanionRange}
              placeholder={t.buddy.compose_pick_time}
              minDate={new Date()}
            />
          ) : (
            <DateRangePicker
              value={carryRange}
              onChange={setCarryRange}
              placeholder={t.buddy.compose_pick_dates}
              minDate={new Date()}
            />
          )}
          <View style={{ height: 16 }} />

          {/* Location */}
          {postType === 'companion' ? (
            <>
              <Text className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
                {t.buddy.field_where_from}
              </Text>
              <TextInput
                value={fromCity}
                onChangeText={setFromCity}
                placeholder="Berlin"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
                className="mb-4 rounded-2xl bg-white px-4 py-3 text-[15px] text-black"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              />
            </>
          ) : (
            <>
              <View className="mb-4 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
                    {t.buddy.field_where_from}
                  </Text>
                  <TextInput
                    value={fromCity}
                    onChangeText={setFromCity}
                    placeholder="Berlin"
                    placeholderTextColor="#9CA3AF"
                    maxLength={100}
                    className="rounded-2xl bg-white px-4 py-3 text-[15px] text-black"
                    style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
                    {t.buddy.field_where_to}
                  </Text>
                  <TextInput
                    value={toCity}
                    onChangeText={setToCity}
                    placeholder="Shanghai"
                    placeholderTextColor="#9CA3AF"
                    maxLength={100}
                    className="rounded-2xl bg-white px-4 py-3 text-[15px] text-black"
                    style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
                  />
                </View>
              </View>
              <View
                className="mb-4 flex-row items-center justify-between rounded-2xl bg-white px-4 py-3"
                style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
              >
                <Text className="flex-1 text-[14px] text-neutral-700">
                  {t.buddy.field_accepts_shipping}
                </Text>
                <Switch
                  value={acceptsShipping}
                  onValueChange={setAcceptsShipping}
                  trackColor={{ true: '#F47C7C', false: '#E5E7EB' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}

          {/* Price — user picks Free, picks Negotiable (and may enter a starting
              amount), or types a fixed price. Free locks the input; Negotiable
              and Free are mutually exclusive. */}
          <Text className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
            {t.buddy.field_price}
          </Text>
          <View
            className="mb-2 flex-row items-center rounded-2xl bg-white px-4 py-3"
            style={{
              borderWidth: 1,
              borderColor: priceDecided ? '#E5E7EB' : '#FECACA',
              opacity: priceMode === 'free' ? 0.5 : 1,
            }}
          >
            <Text className="mr-2 text-[15px] font-semibold text-neutral-500">
              {currency === 'EUR' ? '€' : '$'}
            </Text>
            <TextInput
              value={priceText}
              onChangeText={setPriceText}
              placeholder={t.buddy.compose_price_placeholder}
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              editable={priceMode !== 'free'}
              className="flex-1 text-[15px] text-black"
            />
            <View className="flex-row gap-1">
              {(['EUR', 'USD'] as const).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCurrency(c)}
                  disabled={priceMode === 'free'}
                  className="rounded-full px-2 py-1"
                  style={{ backgroundColor: currency === c ? '#111827' : '#F4F5F8' }}
                >
                  <Text
                    className="text-[11px] font-semibold"
                    style={{ color: currency === c ? '#FFF' : '#6B7280' }}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="mb-4 flex-row gap-2">
            <Pressable
              onPress={() => {
                if (priceMode === 'free') {
                  setPriceMode(null);
                } else {
                  setPriceMode('free');
                  setPriceText('');
                }
              }}
              className="flex-1 rounded-2xl bg-white px-4 py-3"
              style={{
                borderWidth: 1,
                borderColor: priceMode === 'free' ? '#F47C7C' : '#E5E7EB',
                backgroundColor: priceMode === 'free' ? '#FFF1F2' : '#FFFFFF',
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="mr-2 h-5 w-5 items-center justify-center rounded-full"
                  style={{
                    borderWidth: 2,
                    borderColor: priceMode === 'free' ? '#F47C7C' : '#CBD5E1',
                    backgroundColor: priceMode === 'free' ? '#F47C7C' : 'transparent',
                  }}
                >
                  {priceMode === 'free' ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                </View>
                <Text
                  className="text-[14px] font-semibold"
                  style={{ color: priceMode === 'free' ? '#F47C7C' : '#3B2A22' }}
                >
                  {t.buddy.compose_price_free_label}
                </Text>
              </View>
              <Text className="mt-1 text-[11.5px] text-neutral-500">
                {t.buddy.compose_price_free_hint}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setPriceMode(priceMode === 'negotiable' ? null : 'negotiable');
              }}
              className="flex-1 rounded-2xl bg-white px-4 py-3"
              style={{
                borderWidth: 1,
                borderColor: priceMode === 'negotiable' ? '#F47C7C' : '#E5E7EB',
                backgroundColor: priceMode === 'negotiable' ? '#FFF1F2' : '#FFFFFF',
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="mr-2 h-5 w-5 items-center justify-center rounded-full"
                  style={{
                    borderWidth: 2,
                    borderColor: priceMode === 'negotiable' ? '#F47C7C' : '#CBD5E1',
                    backgroundColor: priceMode === 'negotiable' ? '#F47C7C' : 'transparent',
                  }}
                >
                  {priceMode === 'negotiable' ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
                </View>
                <Text
                  className="text-[14px] font-semibold"
                  style={{ color: priceMode === 'negotiable' ? '#F47C7C' : '#3B2A22' }}
                >
                  {t.buddy.compose_price_negotiable_label}
                </Text>
              </View>
              <Text className="mt-1 text-[11.5px] text-neutral-500">
                {t.buddy.compose_price_negotiable_hint}
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Sticky submit */}
        <View
          className="border-t border-neutral-100 bg-white px-4 pb-4 pt-3"
          style={{ paddingBottom: Platform.OS === 'ios' ? 24 : 16 }}
        >
          <Pressable
            onPress={() => void submit()}
            disabled={!canSubmit || create.isPending}
            className="items-center justify-center rounded-full py-3.5"
            style={{ backgroundColor: canSubmit ? '#F47C7C' : '#CBD5E1' }}
          >
            {create.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text className="text-[15px] font-bold text-white">{t.buddy.compose_button}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
