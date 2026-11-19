import { AxiosError } from 'axios';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { OpeningHoursEditor } from './OpeningHoursEditor';
import { useLanguage } from '../../context/LanguageContext';
import type { AuthUser } from '../../features/auth/useAuth';
import { MERCHANT_CATEGORIES, type MerchantCategory, type OpeningHours, useBecomeMerchant } from '../../features/merchants/useMerchants';
import { type PlaceDetails, useFetchPlaceDetails, usePlaceAutocomplete } from '../../features/places/usePlaces';
import { defaultOpeningHours } from '../../lib/merchantFormat';

export type ShopSetupStep = 'find' | 'info' | 'next';

export const SHOP_HELP_EMAIL = 'postervia.app@gmail.com';

function newSessionToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function errorCode(error: unknown): string | undefined {
  return (error as AxiosError<{ error?: { code?: string } }>)?.response?.data?.error?.code;
}

function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

function TwoButtons({
  backLabel,
  onBack,
  goLabel,
  onGo,
  goDisabled,
  busy,
  goTestID,
}: {
  backLabel: string;
  onBack: () => void;
  goLabel: string;
  onGo: () => void;
  goDisabled: boolean;
  busy?: boolean;
  goTestID: string;
}) {
  return (
    <View className="mt-5 flex-row gap-3">
      <Pressable onPress={onBack} accessibilityRole="button" className="flex-1 rounded-3xl bg-gray-100 px-4 py-3">
        <Text className="text-center text-base font-semibold text-gray-600">{backLabel}</Text>
      </Pressable>
      <Pressable
        testID={goTestID}
        onPress={onGo}
        disabled={goDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: goDisabled, busy: Boolean(busy) }}
        className={`flex-1 rounded-3xl px-4 py-3 ${goDisabled ? 'bg-gray-200' : 'bg-primary'}`}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className={`text-center text-base font-bold ${goDisabled ? 'text-gray-500' : 'text-white'}`}>{goLabel}</Text>
        )}
      </Pressable>
    </View>
  );
}

// The shop branch of the setup modal (D-195): find the shop, describe it, then hand over to the guided first listing.
export function ShopSetupSteps({
  step,
  onStepChange,
  onBackToRole,
  onFinished,
}: {
  step: ShopSetupStep;
  onStepChange: (step: ShopSetupStep) => void;
  onBackToRole: () => void;
  /** The account is already a shop by now; the caller decides when the app sees it. */
  onFinished: (user: AuthUser) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [sessionToken, setSessionToken] = useState(newSessionToken);
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [category, setCategory] = useState<MerchantCategory | null>(null);
  const [categoryOther, setCategoryOther] = useState('');
  const [hours, setHours] = useState<OpeningHours>(defaultOpeningHours);
  const [phone, setPhone] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<AuthUser | null>(null);

  const predictions = usePlaceAutocomplete(query, { sessionToken, enabled: step === 'find' && !place });
  const fetchDetails = useFetchPlaceDetails();
  const becomeMerchant = useBecomeMerchant();

  const pickPrediction = async (placeId: string) => {
    setFeedback(null);
    try {
      const details = await fetchDetails.mutateAsync({ placeId, sessionToken });
      setPlace(details);
      setQuery(details.name);
      setSessionToken(newSessionToken());
    } catch {
      setFeedback(t.merchant.find_error);
    }
  };

  const categoryReady = category !== null && (category !== 'other' || categoryOther.trim().length > 0);

  const submit = async () => {
    if (!place || !category || !categoryReady) return;
    setFeedback(null);
    try {
      const user = await becomeMerchant.mutateAsync({
        place_id: place.place_id,
        place_name: place.name,
        address: place.address || null,
        latitude: place.latitude,
        longitude: place.longitude,
        category,
        category_other: category === 'other' ? categoryOther.trim() : null,
        opening_hours: hours,
        phone: phone.trim() || null,
        timezone: deviceTimeZone(),
      });
      setCreatedUser(user);
      onStepChange('next');
    } catch (error) {
      setFeedback(
        errorCode(error) === 'merchant.place_taken'
          ? t.merchant.place_taken.replace('{email}', SHOP_HELP_EMAIL)
          : t.common.error,
      );
    }
  };

  const items = predictions.data ?? [];

  return (
    <View>
      {step === 'find' ? (
        <View>
          <Text className="mb-2 text-base font-semibold text-gray-900">{t.merchant.find_prompt}</Text>
          <Text className="mb-4 text-sm leading-6 text-gray-500">{t.merchant.find_hint}</Text>
          <TextInput
            testID="shop.find.input"
            accessibilityLabel={t.merchant.find_placeholder}
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (place) setPlace(null);
            }}
            placeholder={t.merchant.find_placeholder}
            returnKeyType="search"
            className="rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          />
          <View className="mt-3 gap-2">
            {place ? (
              <View className="rounded-3xl border border-primary bg-primary/10 px-4 py-3">
                <Text className="text-base font-semibold text-primary">{place.name}</Text>
                {place.address ? <Text className="mt-1 text-sm text-gray-500">{place.address}</Text> : null}
              </View>
            ) : predictions.isFetching || fetchDetails.isPending ? (
              <View className="items-center py-4">
                <ActivityIndicator color="#FF9F6E" />
                <Text className="mt-2 text-sm text-gray-500">{t.merchant.find_searching}</Text>
              </View>
            ) : predictions.isError ? (
              <Text className="py-4 text-center text-sm text-gray-500">{t.merchant.find_error}</Text>
            ) : items.length > 0 ? (
              items.slice(0, 5).map((item) => (
                <Pressable
                  key={item.place_id}
                  testID="shop.find.result"
                  accessibilityRole="button"
                  onPress={() => void pickPrediction(item.place_id)}
                  className="rounded-3xl border border-gray-200 bg-white px-4 py-3"
                >
                  <Text className="text-base font-semibold text-gray-900">{item.main_text}</Text>
                  {item.secondary_text ? <Text className="mt-1 text-sm text-gray-500">{item.secondary_text}</Text> : null}
                </Pressable>
              ))
            ) : query.trim().length >= 2 && predictions.isSuccess ? (
              <Text className="py-4 text-center text-sm text-gray-500">{t.merchant.find_empty}</Text>
            ) : null}
          </View>
          <TwoButtons
            backLabel={t.common.back}
            onBack={onBackToRole}
            goLabel={t.merchant.this_is_mine}
            onGo={() => onStepChange('info')}
            goDisabled={!place}
            goTestID="shop.find.continue"
          />
        </View>
      ) : null}

      {step === 'info' && place ? (
        <View>
          <View className="mb-4 rounded-3xl bg-primary/5 px-4 py-3">
            <Text className="text-xs font-bold uppercase tracking-[1px] text-primary/70">{t.merchant.selected_label}</Text>
            <Text className="mt-1 text-base font-semibold text-gray-900">{place.name}</Text>
            {place.address ? <Text className="mt-0.5 text-sm text-gray-500">{place.address}</Text> : null}
            <Pressable
              onPress={() => onStepChange('find')}
              accessibilityRole="button"
              className="mt-3 self-start items-center justify-center rounded-full bg-white px-3 py-1.5"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              <Text className="text-xs font-semibold text-primary">{t.merchant.change_shop}</Text>
            </Pressable>
          </View>

          <Text className="mb-2 text-base font-semibold text-gray-900">{t.merchant.category_label}</Text>
          <View className="flex-row flex-wrap gap-2">
            {MERCHANT_CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <Pressable
                  key={item}
                  testID={`shop.category.${item}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setCategory(item)}
                  className={`rounded-full px-4 py-3 ${active ? 'bg-primary' : 'bg-gray-100'}`}
                >
                  <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-gray-700'}`}>
                    {t.merchant[`category_${item}`]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {category === 'other' ? (
            <TextInput
              testID="shop.category.other-input"
              accessibilityLabel={t.merchant.category_other_placeholder}
              value={categoryOther}
              onChangeText={setCategoryOther}
              maxLength={40}
              placeholder={t.merchant.category_other_placeholder}
              className="mt-3 rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
            />
          ) : null}

          <Text className="mb-2 mt-5 text-base font-semibold text-gray-900">{t.merchant.hours_label}</Text>
          <OpeningHoursEditor value={hours} onChange={setHours} />

          <Text className="mb-2 mt-5 text-base font-semibold text-gray-900">
            {t.merchant.phone_label} <Text className="text-sm font-normal text-gray-500">{t.merchant.optional}</Text>
          </Text>
          <TextInput
            testID="shop.phone"
            accessibilityLabel={t.merchant.phone_label}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={40}
            placeholder="+49 …"
            className="rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
          />

          {feedback ? <Text className="mt-4 text-center text-sm text-danger">{feedback}</Text> : null}
          <TwoButtons
            backLabel={t.common.back}
            onBack={() => onStepChange('find')}
            goLabel={t.guide.continue_step}
            onGo={() => void submit()}
            goDisabled={!categoryReady || becomeMerchant.isPending}
            busy={becomeMerchant.isPending}
            goTestID="shop.info.continue"
          />
        </View>
      ) : null}

      {step === 'next' ? (
        <View>
          <Text className="mb-2 text-base font-semibold text-gray-900">{t.merchant.next_title}</Text>
          <Text className="mb-4 text-sm leading-6 text-gray-500">{t.merchant.next_hint}</Text>
          <View className="gap-3">
            {[t.merchant.next_step_photos, t.merchant.next_step_name, t.merchant.next_step_price].map((label, index) => (
              <View key={label} className="flex-row items-center gap-3">
                <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-primary/10">
                  <Text className="text-sm font-extrabold text-primary">{index + 1}</Text>
                </View>
                <Text className="flex-1 text-base text-gray-800">{label}</Text>
              </View>
            ))}
          </View>
          <Pressable
            testID="shop.next.start"
            accessibilityRole="button"
            disabled={!createdUser}
            onPress={() => createdUser && onFinished(createdUser)}
            className="mt-5 rounded-3xl bg-primary px-4 py-3"
          >
            <Text className="text-center text-base font-bold text-white">{t.merchant.start_setup}</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'find' && feedback ? <Text className="mt-4 text-center text-sm text-danger">{feedback}</Text> : null}
    </View>
  );
}
