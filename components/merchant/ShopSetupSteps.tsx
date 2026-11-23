import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { OpeningHoursEditor } from './OpeningHoursEditor';
import { OpenedMonthField, ShopCategoryField } from '../auth/AccountTypeFields';
import { useLanguage } from '../../context/LanguageContext';
import type { AuthUser } from '../../features/auth/useAuth';
import {
  type BecomeMerchantInput,
  type MerchantCategory,
  type OpeningHours,
  type ShopKind,
  type SignupShop,
  useBecomeMerchant,
  useShopPlacePrefill,
} from '../../features/merchants/useMerchants';
import { type PlaceDetails, useFetchPlaceDetails, usePlaceAutocomplete } from '../../features/places/usePlaces';
import { defaultOpeningHours } from '../../lib/merchantFormat';
import { normalizeShopLink, openedMonthValid } from '../../lib/shopSignup';
import { colors } from '../../theme/tokens';

export type ShopSetupStep = 'kind' | 'find' | 'info' | 'online' | 'next';

export const SHOP_HELP_EMAIL = 'postervia.app@gmail.com';

const NO_HOURS: OpeningHours = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
const INPUT_CLASS = 'rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900';

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

function isHttpsLink(value: string): boolean {
  return /^https:\/\/[^\s/?#]+\.[^\s]+$/i.test(value.trim());
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
  onBack?: () => void;
  goLabel: string;
  onGo: () => void;
  goDisabled: boolean;
  busy?: boolean;
  goTestID: string;
}) {
  return (
    <View className="mt-5 flex-row gap-3">
      {onBack ? (
        <Pressable onPress={onBack} accessibilityRole="button" className="flex-1 rounded-3xl bg-gray-100 px-4 py-3">
          <Text className="text-center text-base font-semibold text-gray-600">{backLabel}</Text>
        </Pressable>
      ) : null}
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

function FieldLabel({ children, optional }: { children: string; optional?: string }) {
  return (
    <Text className="mb-2 mt-5 text-base font-semibold text-gray-900">
      {children} {optional ? <Text className="text-sm font-normal text-gray-500">{optional}</Text> : null}
    </Text>
  );
}

// The shop setup (D-195, D-200): a shop people visit is found on the map, an online
// shop gives its website and Impressum; then the guided first listing.
export function ShopSetupSteps({
  step,
  onStepChange,
  kind,
  onKindChange,
  signupShop,
  onExit,
  onFinished,
  signupName,
}: {
  step: ShopSetupStep;
  onStepChange: (step: ShopSetupStep) => void;
  kind: ShopKind | null;
  onKindChange: (kind: ShopKind) => void;
  /** What the shop gave at sign-up; null when an existing account turns into a shop. */
  signupShop: SignupShop | null | undefined;
  /** The name typed at sign-up, used as the online shop's name until it is changed. */
  signupName?: string;
  /** Back on the first step; absent when setup cannot be left (a shop just signed up). */
  onExit?: () => void;
  /** The account is already a shop by now; the caller decides when the app sees it. */
  onFinished: (user: AuthUser) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [sessionToken, setSessionToken] = useState(newSessionToken);
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [category, setCategory] = useState<MerchantCategory | null>(signupShop?.category ?? null);
  const [categoryOther, setCategoryOther] = useState(signupShop?.category_other ?? '');
  const [openedYear, setOpenedYear] = useState('');
  const [openedMonth, setOpenedMonth] = useState<number | null>(null);
  const [hours, setHours] = useState<OpeningHours>(defaultOpeningHours);
  const [phone, setPhone] = useState('');
  const [googleWebsite, setGoogleWebsite] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [shopName, setShopName] = useState(signupShop ? (signupName ?? '') : '');
  const [website, setWebsite] = useState('');
  const [impressum, setImpressum] = useState('');
  const [linksTouched, setLinksTouched] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<AuthUser | null>(null);

  const predictions = usePlaceAutocomplete(query, { sessionToken, enabled: step === 'find' && !place });
  const fetchDetails = useFetchPlaceDetails();
  const prefill = useShopPlacePrefill();
  const becomeMerchant = useBecomeMerchant();

  // An existing account turning into a shop never gave an opening month; ask for it here.
  const needsOpened = !signupShop;
  const openedReady = !needsOpened || openedMonthValid(openedYear, openedMonth);
  const categoryReady = category !== null && (category !== 'other' || categoryOther.trim().length > 0);
  const websiteLink = normalizeShopLink(website);
  const impressumLink = normalizeShopLink(impressum);
  const linksReady = isHttpsLink(websiteLink) && isHttpsLink(impressumLink);
  const onlineReady = shopName.trim().length > 0 && linksReady && categoryReady && openedReady;

  const pickPrediction = async (placeId: string) => {
    setFeedback(null);
    try {
      const details = await fetchDetails.mutateAsync({ placeId, sessionToken });
      setPlace(details);
      setQuery(details.name);
      setSessionToken(newSessionToken());
      // What Google knows starts the form filled in; the owner checks it on the next step.
      prefill.mutate(details.place_id, {
        onSuccess: (found) => {
          if (found.opening_hours) setHours(found.opening_hours);
          if (found.phone) setPhone((current) => current || (found.phone ?? ''));
          setGoogleWebsite(found.website_url);
          setPrefilled(Boolean(found.opening_hours || found.phone));
        },
      });
    } catch {
      setFeedback(t.merchant.find_error);
    }
  };

  const submit = async (input: BecomeMerchantInput) => {
    setFeedback(null);
    try {
      const user = await becomeMerchant.mutateAsync({
        ...input,
        ...(needsOpened ? { opened_year: Number(openedYear), opened_month: openedMonth } : {}),
      });
      setCreatedUser(user);
      onStepChange('next');
    } catch (error) {
      const code = errorCode(error);
      setFeedback(
        code === 'merchant.place_taken'
          ? t.merchant.place_taken.replace('{email}', SHOP_HELP_EMAIL)
          : code === 'merchant.website_taken'
            ? t.merchant.website_taken.replace('{email}', SHOP_HELP_EMAIL)
            : t.common.error,
      );
    }
  };

  const submitPhysical = () => {
    if (!place || !category || !categoryReady || !openedReady) return;
    void submit({
      kind: 'physical',
      place_id: place.place_id,
      place_name: place.name,
      address: place.address || null,
      latitude: place.latitude,
      longitude: place.longitude,
      website_url: googleWebsite && isHttpsLink(googleWebsite) ? googleWebsite : null,
      impressum_url: null,
      category,
      category_other: category === 'other' ? categoryOther.trim() : null,
      opening_hours: hours,
      phone: phone.trim() || null,
      timezone: deviceTimeZone(),
    });
  };

  const submitOnline = () => {
    if (!category || !onlineReady) return;
    void submit({
      kind: 'online',
      place_id: null,
      place_name: shopName.trim(),
      address: null,
      latitude: null,
      longitude: null,
      website_url: websiteLink,
      impressum_url: impressumLink,
      category,
      category_other: category === 'other' ? categoryOther.trim() : null,
      opening_hours: NO_HOURS,
      phone: phone.trim() || null,
      timezone: deviceTimeZone(),
    });
  };

  const items = predictions.data ?? [];
  const categoryField = (
    <View className="mt-5">
      <ShopCategoryField
        category={category}
        categoryOther={categoryOther}
        onChange={(value) => {
          setCategory(value.category);
          setCategoryOther(value.categoryOther);
        }}
      />
    </View>
  );
  const openedField = needsOpened ? (
    <View className="mt-5">
      <OpenedMonthField
        year={openedYear}
        month={openedMonth}
        onChange={(value) => {
          setOpenedYear(value.year);
          setOpenedMonth(value.month);
        }}
      />
    </View>
  ) : null;
  const phoneField = (
    <>
      <FieldLabel optional={t.merchant.optional}>{t.merchant.phone_label}</FieldLabel>
      <TextInput
        testID="shop.phone"
        accessibilityLabel={t.merchant.phone_label}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={40}
        placeholder="+49 …"
        className={INPUT_CLASS}
      />
    </>
  );

  return (
    <View>
      {step === 'kind' ? (
        <View>
          <View className="gap-3">
            {(['physical', 'online'] as const).map((item) => {
              const active = kind === item;
              return (
                <Pressable
                  key={item}
                  testID={`shop.kind.${item}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => onKindChange(item)}
                  className={`flex-row items-center gap-3 rounded-3xl border-2 px-4 py-4 ${active ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'}`}
                >
                  <Ionicons
                    name={item === 'physical' ? 'storefront-outline' : 'globe-outline'}
                    size={22}
                    color={active ? colors.brandCoral : colors.textMuted}
                  />
                  <View className="flex-1">
                    <Text className="text-base font-bold text-gray-900">
                      {item === 'physical' ? t.merchant.kind_physical : t.merchant.kind_online}
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-gray-600">
                      {item === 'physical' ? t.merchant.kind_physical_hint : t.merchant.kind_online_hint}
                    </Text>
                  </View>
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={active ? colors.brandCoral : '#D1D5DB'}
                  />
                </Pressable>
              );
            })}
          </View>
          <TwoButtons
            backLabel={t.common.back}
            onBack={onExit}
            goLabel={t.guide.continue_step}
            onGo={() => onStepChange(kind === 'online' ? 'online' : 'find')}
            goDisabled={kind === null}
            goTestID="shop.kind.continue"
          />
        </View>
      ) : null}

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
              if (place) {
                setPlace(null);
                setPrefilled(false);
                setGoogleWebsite(null);
              }
            }}
            placeholder={t.merchant.find_placeholder}
            returnKeyType="search"
            className={INPUT_CLASS}
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
            onBack={() => onStepChange('kind')}
            goLabel={t.merchant.this_is_mine}
            onGo={() => onStepChange('info')}
            goDisabled={!place || prefill.isPending}
            busy={prefill.isPending}
            goTestID="shop.find.continue"
          />
          {feedback ? <Text className="mt-4 text-center text-sm text-danger">{feedback}</Text> : null}
        </View>
      ) : null}

      {step === 'info' && place ? (
        <View>
          <View className="mb-1 rounded-3xl bg-primary/5 px-4 py-3">
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
          {prefilled ? (
            <Text testID="shop.prefill-note" className="mt-3 text-sm leading-5 text-gray-600">
              {t.merchant.prefill_note}
            </Text>
          ) : null}

          {categoryField}
          {openedField}

          <FieldLabel>{t.merchant.hours_label}</FieldLabel>
          <OpeningHoursEditor value={hours} onChange={setHours} />

          {phoneField}

          {feedback ? <Text className="mt-4 text-center text-sm text-danger">{feedback}</Text> : null}
          <TwoButtons
            backLabel={t.common.back}
            onBack={() => onStepChange('find')}
            goLabel={t.guide.continue_step}
            onGo={submitPhysical}
            goDisabled={!categoryReady || !openedReady || becomeMerchant.isPending}
            busy={becomeMerchant.isPending}
            goTestID="shop.info.continue"
          />
        </View>
      ) : null}

      {step === 'online' ? (
        <View>
          <FieldLabel>{t.merchant.online_name_label}</FieldLabel>
          <TextInput
            testID="shop.online.name"
            accessibilityLabel={t.merchant.online_name_label}
            value={shopName}
            onChangeText={setShopName}
            maxLength={200}
            className={INPUT_CLASS}
          />

          <FieldLabel>{t.merchant.website_label}</FieldLabel>
          <TextInput
            testID="shop.online.website"
            accessibilityLabel={t.merchant.website_label}
            value={website}
            onChangeText={setWebsite}
            onBlur={() => setLinksTouched(true)}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://"
            className={INPUT_CLASS}
          />

          <FieldLabel>{t.merchant.impressum_label}</FieldLabel>
          <TextInput
            testID="shop.online.impressum"
            accessibilityLabel={t.merchant.impressum_label}
            value={impressum}
            onChangeText={setImpressum}
            onBlur={() => setLinksTouched(true)}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://"
            className={INPUT_CLASS}
          />
          <Text className="mt-2 text-sm leading-5 text-gray-500">{t.merchant.impressum_hint}</Text>
          {linksTouched && (website.trim() || impressum.trim()) && !linksReady ? (
            <Text testID="shop.online.link-invalid" className="mt-2 text-sm text-danger">
              {t.merchant.link_invalid}
            </Text>
          ) : null}

          {categoryField}
          {openedField}
          {phoneField}

          {feedback ? <Text className="mt-4 text-center text-sm text-danger">{feedback}</Text> : null}
          <TwoButtons
            backLabel={t.common.back}
            onBack={() => onStepChange('kind')}
            goLabel={t.guide.continue_step}
            onGo={submitOnline}
            goDisabled={!onlineReady || becomeMerchant.isPending}
            busy={becomeMerchant.isPending}
            goTestID="shop.online.continue"
          />
        </View>
      ) : null}

      {step === 'next' ? (
        <View>
          <Text className="mb-2 text-base font-semibold text-gray-900">{t.merchant.next_title}</Text>
          <Text className="mb-4 text-sm leading-6 text-gray-500">{t.merchant.next_hint}</Text>
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
    </View>
  );
}
