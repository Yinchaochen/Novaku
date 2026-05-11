import * as Location from 'expo-location';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import {
  type OnboardingArrivalStage,
  type OnboardingIntentTag,
  useCitySuggestions,
  useResolveCityFromCoordinates,
  useUpdateProfile,
} from '../features/auth/useAuth';
import { useAuthStore } from '../store/authStore';

type Step = 'location' | 'city' | 'persona';
type Mode = 'required' | 'edit';

type SelectedCity = {
  name: string;
  subtitle: string;
  latitude: number | null;
  longitude: number | null;
};

const INTENT_TAGS: OnboardingIntentTag[] = ['study', 'work', 'travel', 'settle'];
const ARRIVAL_STAGES: OnboardingArrivalStage[] = ['just_arrived', 'settled', 'local'];

function defaultArrivalStage(identity: string | undefined): OnboardingArrivalStage {
  if (identity === 'resident') {
    return 'settled';
  }
  if (identity === 'local') {
    return 'local';
  }
  return 'just_arrived';
}

export function OnboardingModal({
  visible,
  mode = 'required',
  onDone,
  onCancel,
}: {
  visible: boolean;
  mode?: Mode;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const updateProfile = useUpdateProfile();
  const resolveCity = useResolveCityFromCoordinates();

  const [step, setStep] = useState<Step>('location');
  const [cityQuery, setCityQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);
  const [selectedIntents, setSelectedIntents] = useState<OnboardingIntentTag[]>([]);
  const [selectedStage, setSelectedStage] = useState<OnboardingArrivalStage>('just_arrived');
  const [locationSource, setLocationSource] = useState<'device' | 'manual' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const deferredCityQuery = useDeferredValue(cityQuery);
  const citySuggestions = useCitySuggestions(
    deferredCityQuery,
    visible && step === 'city' && deferredCityQuery.trim().length >= 2
  );

  useEffect(() => {
    if (!visible || !user) {
      return;
    }

    setStep(mode === 'edit' && user.onboarding_completed ? 'persona' : 'location');
    setCityQuery(user.city ?? '');
    setSelectedCity(
      user.city
        ? {
            name: user.city,
            subtitle: '',
            latitude: user.latitude ?? null,
            longitude: user.longitude ?? null,
          }
        : null
    );
    setSelectedIntents(user.intent_tags?.length ? [...user.intent_tags] : []);
    setSelectedStage(user.arrival_stage ?? defaultArrivalStage(user.identity));
    setLocationSource(user.location_source ?? null);
    setFeedback(null);
  }, [visible, user?.id, mode]);

  const suggestions = citySuggestions.data ?? [];
  const canDismiss = mode === 'edit';
  const isBusy = updateProfile.isPending || resolveCity.isPending;
  const canContinueFromCity = Boolean(selectedCity?.name);
  const canSubmit = Boolean(selectedCity?.name && selectedIntents.length > 0 && selectedStage && !isBusy);

  const selectedCityLabel = useMemo(() => {
    if (!selectedCity) {
      return null;
    }
    return selectedCity.subtitle ? `${selectedCity.name} · ${selectedCity.subtitle}` : selectedCity.name;
  }, [selectedCity]);

  const handleUseLocation = async () => {
    setFeedback(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationSource('manual');
        setFeedback(t.onboarding.location_denied);
        setStep('city');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const city = await resolveCity.mutateAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setSelectedCity({
        name: city.name,
        subtitle: city.subtitle,
        latitude: city.latitude,
        longitude: city.longitude,
      });
      setCityQuery(city.name);
      setLocationSource('device');
      setStep('persona');
    } catch {
      setLocationSource('manual');
      setFeedback(t.onboarding.location_failed);
      setStep('city');
    }
  };

  const handleManualCity = () => {
    setLocationSource('manual');
    setFeedback(null);
    setStep('city');
  };

  const handleSelectCity = (city: SelectedCity) => {
    setSelectedCity(city);
    setCityQuery(city.name);
    setFeedback(null);
  };

  const toggleIntent = (intent: OnboardingIntentTag) => {
    setSelectedIntents((current) =>
      current.includes(intent) ? current.filter((item) => item !== intent) : [...current, intent]
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedCity) {
      return;
    }

    setFeedback(null);
    try {
      await updateProfile.mutateAsync({
        city: selectedCity.name,
        arrival_stage: selectedStage,
        intent_tags: selectedIntents,
        onboarding_completed: true,
        location_source: locationSource ?? 'manual',
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
      });
      onDone();
    } catch {
      setFeedback(t.common.error);
    }
  };

  const handleBack = () => {
    if (step === 'persona') {
      setStep('city');
      return;
    }
    if (step === 'city') {
      setStep('location');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canDismiss ? (onCancel ?? onDone) : () => {}}
    >
      <View className="flex-1 justify-center px-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
        <View
          className="max-h-[88%] rounded-[28px] bg-white px-5 pt-4"
          style={{ paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : 20 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-extrabold text-gray-900">{t.onboarding.title}</Text>
              <Text className="mt-1 text-sm text-gray-500">
                {step === 'location'
                  ? t.onboarding.location_step_title
                  : step === 'city'
                    ? t.onboarding.city_step_title
                    : t.onboarding.persona_step_title}
              </Text>
            </View>
            {canDismiss ? (
              <Pressable onPress={onCancel ?? onDone} className="rounded-full bg-gray-100 px-3 py-2">
                <Text className="text-sm font-semibold text-gray-500">{t.common.cancel}</Text>
              </Pressable>
            ) : null}
          </View>

          <View className="mb-4 flex-row gap-2">
            {(['location', 'city', 'persona'] as Step[]).map((item) => (
              <View
                key={item}
                className={`h-2 flex-1 rounded-full ${step === item ? 'bg-primary' : 'bg-gray-200'}`}
              />
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {step === 'location' ? (
              <View>
                <Text className="mb-2 text-base font-semibold text-gray-900">
                  {t.onboarding.location_prompt}
                </Text>
                <Text className="mb-5 text-sm leading-6 text-gray-500">
                  {t.onboarding.location_hint}
                </Text>

                <View className="gap-3">
                  <Pressable
                    onPress={handleUseLocation}
                    disabled={isBusy}
                    className="rounded-3xl bg-primary px-5 py-4"
                  >
                    {resolveCity.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-center text-base font-bold text-white">
                        {t.onboarding.location_allow}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={handleManualCity}
                    disabled={isBusy}
                    className="rounded-3xl bg-primary/10 px-5 py-4"
                  >
                    <Text className="text-center text-base font-bold text-primary">
                      {t.onboarding.location_manual}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {step === 'city' ? (
              <View>
                <Text className="mb-2 text-base font-semibold text-gray-900">
                  {t.onboarding.city_prompt}
                </Text>
                <Text className="mb-4 text-sm leading-6 text-gray-500">
                  {t.onboarding.city_hint}
                </Text>

                <TextInput
                  value={cityQuery}
                  onChangeText={(value) => {
                    setCityQuery(value);
                    if (selectedCity && value.trim() !== selectedCity.name) {
                      setSelectedCity(null);
                    }
                  }}
                  placeholder={t.onboarding.city_search_placeholder}
                  className="rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
                />

                <View className="mt-4 gap-2">
                  {citySuggestions.isLoading ? (
                    <View className="items-center py-4">
                      <ActivityIndicator color="#FF9F6E" />
                      <Text className="mt-2 text-sm text-gray-500">{t.onboarding.city_searching}</Text>
                    </View>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((city) => {
                      const active = selectedCity?.name === city.name && selectedCity?.subtitle === city.subtitle;
                      return (
                        <Pressable
                          key={`${city.name}-${city.latitude}-${city.longitude}`}
                          onPress={() => handleSelectCity(city)}
                          className={`rounded-3xl border px-4 py-3 ${
                            active ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <Text className={`text-base font-semibold ${active ? 'text-primary' : 'text-gray-900'}`}>
                            {city.name}
                          </Text>
                          <Text className="mt-1 text-sm text-gray-500">{city.subtitle}</Text>
                        </Pressable>
                      );
                    })
                  ) : cityQuery.trim().length >= 2 ? (
                    <Text className="py-4 text-center text-sm text-gray-500">
                      {t.onboarding.city_empty}
                    </Text>
                  ) : null}
                </View>

                <View className="mt-5 flex-row gap-3">
                  <Pressable onPress={handleBack} className="flex-1 rounded-3xl bg-gray-100 px-4 py-3">
                    <Text className="text-center text-base font-semibold text-gray-600">{t.common.back}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setStep('persona')}
                    disabled={!canContinueFromCity}
                    className={`flex-1 rounded-3xl px-4 py-3 ${canContinueFromCity ? 'bg-primary' : 'bg-gray-200'}`}
                  >
                    <Text
                      className={`text-center text-base font-bold ${canContinueFromCity ? 'text-white' : 'text-gray-500'}`}
                    >
                      {t.onboarding.city_continue}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {step === 'persona' ? (
              <View>
                <View className="mb-4 rounded-3xl bg-primary/5 px-4 py-3">
                  <Text className="text-xs font-bold uppercase tracking-[1px] text-primary/70">
                    {t.onboarding.city_selected_label}
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-gray-900">
                    {selectedCityLabel ?? user?.city ?? ''}
                  </Text>
                  <Pressable onPress={() => setStep('city')} className="mt-3 self-start rounded-full bg-white px-3 py-1.5">
                    <Text className="text-xs font-semibold text-primary">{t.onboarding.change_city}</Text>
                  </Pressable>
                </View>

                <Text className="mb-2 text-base font-semibold text-gray-900">
                  {t.onboarding.intent_prompt}
                </Text>
                <Text className="mb-4 text-sm leading-6 text-gray-500">
                  {t.onboarding.intent_hint}
                </Text>

                <View className="mb-5 flex-row flex-wrap gap-3">
                  {INTENT_TAGS.map((intent) => {
                    const active = selectedIntents.includes(intent);
                    return (
                      <Pressable
                        key={intent}
                        onPress={() => toggleIntent(intent)}
                        className={`rounded-full px-4 py-3 ${
                          active ? 'bg-primary' : 'bg-gray-100'
                        }`}
                      >
                        <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-gray-700'}`}>
                          {t.onboarding[`intent_${intent}`]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text className="mb-2 text-base font-semibold text-gray-900">
                  {t.onboarding.stage_prompt}
                </Text>
                <Text className="mb-4 text-sm leading-6 text-gray-500">
                  {t.onboarding.stage_hint}
                </Text>

                <View className="gap-3">
                  {ARRIVAL_STAGES.map((arrivalStage) => {
                    const active = selectedStage === arrivalStage;
                    return (
                      <Pressable
                        key={arrivalStage}
                        onPress={() => setSelectedStage(arrivalStage)}
                        className={`rounded-3xl border px-4 py-4 ${
                          active ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <Text className={`text-base font-semibold ${active ? 'text-primary' : 'text-gray-900'}`}>
                          {t.onboarding[`stage_${arrivalStage}`]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="mt-5 flex-row gap-3">
                  <Pressable onPress={handleBack} className="flex-1 rounded-3xl bg-gray-100 px-4 py-3">
                    <Text className="text-center text-base font-semibold text-gray-600">{t.common.back}</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    className={`flex-1 rounded-3xl px-4 py-3 ${canSubmit ? 'bg-primary' : 'bg-gray-200'}`}
                  >
                    {updateProfile.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className={`text-center text-base font-bold ${canSubmit ? 'text-white' : 'text-gray-500'}`}>
                        {t.onboarding.finish}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}

            {feedback ? (
              <Text className="mt-4 text-center text-sm text-danger">{feedback}</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
