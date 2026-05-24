import { useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsHeader } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { reportToSentry } from '../../lib/sentry';
import { useAuthStore } from '../../store/authStore';
import { AuthUser } from '../../features/auth/useAuth';
import {
  BillingPlan,
  useBillingMe,
  useCheckoutSession,
  usePortalSession,
  VIANTER_PLUS_PRICING,
} from '../../features/billing/useBilling';

export default function SubscribeScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<BillingPlan>('yearly');
  const { data: billing, isLoading, refetch } = useBillingMe();
  const checkout = useCheckoutSession();
  const portal = usePortalSession();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  const monthly = VIANTER_PLUS_PRICING.monthly;
  const yearly = VIANTER_PLUS_PRICING.yearly;

  /**
   * Refresh subscription state after returning from Stripe Checkout / Portal.
   * Webhooks fire asynchronously — usually within 1–3s in test mode, but can
   * lag. We poll up to 5 times (10s total) until is_vianter_plus flips, then
   * sync AuthStore so all paywall checks across the app see the new state.
   */
  const refreshAfterStripe = async () => {
    let updated = false;
    for (let i = 0; i < 5; i += 1) {
      const result = await refetch();
      if (result.data?.is_vianter_plus) {
        updated = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    try {
      const me = await api.get('/auth/me');
      setUser(me.data.data as AuthUser);
    } catch (err) {
      // P1.8 (audit FE-CRIT-5): user paid Stripe but /auth/me refresh failed.
      // Paywall sticks even though the subscription is active — direct revenue
      // / refund-ticket risk. Capture so we can correlate with Stripe webhook
      // events and reach out to the user manually if needed. AuthStore is left
      // as-is; useMe() will refresh on next mount.
      reportToSentry(err, { context: 'post-stripe-refresh', plan });
    }
    await queryClient.invalidateQueries({ queryKey: ['me'] });
    await queryClient.invalidateQueries({ queryKey: ['billing'] });
    return updated;
  };

  const onSubscribe = async () => {
    try {
      const { url } = await checkout.mutateAsync(plan);
      const result = await WebBrowser.openAuthSessionAsync(url, 'postervia://billing/success');
      if (result.type === 'success' || result.type === 'cancel') {
        await refreshAfterStripe();
      }
    } catch (err) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === 'subscription_exists') {
        Alert.alert(t.billing.title, t.billing.already_subscribed);
      } else {
        Alert.alert(t.billing.title, t.billing.checkout_error);
        // Capture genuine checkout failures (network / 5xx / unexpected codes).
        // subscription_exists is a user-state issue we surface with a friendly
        // alert and don't treat as an error.
        reportToSentry(err, { context: 'stripe_checkout', plan, code });
      }
    }
  };

  const onManage = async () => {
    try {
      const { url } = await portal.mutateAsync();
      await WebBrowser.openAuthSessionAsync(url, 'postervia://billing/success');
      await refreshAfterStripe();
    } catch (err) {
      Alert.alert(t.billing.title, t.billing.checkout_error);
      reportToSentry(err, { context: 'stripe_portal' });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F4F5F8] items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#FF9F6E" />
      </SafeAreaView>
    );
  }

  const isSubscribed = billing?.is_vianter_plus ?? false;
  const sub = billing?.subscription;

  return (
    <SafeAreaView className="flex-1 bg-[#F4F5F8]" edges={['top']}>
      <SettingsHeader title={t.billing.title} onBack={() => router.back()} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 gap-4 pt-2"
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 48) : 48,
        }}
      >
        {/* Hero */}
        <View className="bg-white rounded-3xl p-6 shadow-sm">
          <Text className="text-xs font-bold uppercase tracking-widest text-[#C76F4A] mb-2">
            Postervia+
          </Text>
          <Text className="text-2xl font-extrabold text-neutral-900 mb-2">
            {t.billing.hero_headline}
          </Text>
          <Text className="text-[14px] leading-5 text-neutral-600">{t.billing.hero_body}</Text>
        </View>

        {/* Status banner if already subscribed */}
        {isSubscribed && sub ? (
          <View
            className="rounded-3xl p-5"
            style={{ backgroundColor: '#E8F8EC', borderWidth: 1, borderColor: '#C7ECCF' }}
          >
            <Text className="font-bold text-[16px]" style={{ color: '#226A33' }}>
              {sub.status === 'trialing' ? t.billing.status_trialing : t.billing.status_active}
            </Text>
            <Text className="mt-2 text-[13px] leading-5" style={{ color: '#226A33' }}>
              {sub.status === 'trialing' && sub.trial_end
                ? t.billing.trial_ends_on.replace('{date}', new Date(sub.trial_end).toLocaleDateString())
                : sub.cancel_at_period_end && sub.current_period_end
                ? t.billing.cancels_on.replace(
                    '{date}',
                    new Date(sub.current_period_end).toLocaleDateString()
                  )
                : sub.current_period_end
                ? t.billing.renews_on.replace(
                    '{date}',
                    new Date(sub.current_period_end).toLocaleDateString()
                  )
                : ''}
            </Text>
            <Pressable
              onPress={onManage}
              disabled={portal.isPending}
              className="mt-4 self-start rounded-full bg-white px-4 py-2"
              style={{ borderWidth: 1, borderColor: '#C7ECCF', opacity: portal.isPending ? 0.5 : 1 }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: '#226A33' }}>
                {t.billing.manage_subscription}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Plan picker (hidden if subscribed) */}
        {!isSubscribed ? (
          <>
            <Text className="px-2 text-[12px] font-semibold uppercase tracking-wider text-neutral-400 mt-2">
              {t.billing.choose_plan}
            </Text>
            <PlanCard
              selected={plan === 'yearly'}
              onPress={() => setPlan('yearly')}
              title={t.billing.plan_yearly_title}
              price={`€${yearly.amount.toFixed(0)} / ${t.billing.year}`}
              monthlyEquivalent={`€${(yearly.amount / 12).toFixed(2)} / ${t.billing.month}`}
              badge={t.billing.save_percent.replace('{percent}', String(yearly.discountPercent))}
            />
            <PlanCard
              selected={plan === 'monthly'}
              onPress={() => setPlan('monthly')}
              title={t.billing.plan_monthly_title}
              price={`€${monthly.amount.toFixed(2)} / ${t.billing.month}`}
            />

            <View className="rounded-2xl bg-white p-4 mt-2">
              <Text className="text-[12px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                {t.billing.what_you_get}
              </Text>
              <Feature label={t.billing.feature_full_dag} />
              <Feature label={t.billing.feature_verified_guides} />
              <Feature label={t.billing.feature_unlimited_ai} />
              <Feature label={t.billing.feature_unlimited_doc_ocr} />
              <Feature label={t.billing.feature_half_buddy_fee} />
            </View>

            <Pressable
              onPress={onSubscribe}
              disabled={checkout.isPending}
              className="rounded-3xl py-4 items-center mt-3"
              style={{ backgroundColor: '#C76F4A', opacity: checkout.isPending ? 0.6 : 1 }}
            >
              <Text className="text-white font-bold text-[16px]">
                {checkout.isPending ? t.billing.opening_checkout : t.billing.start_trial}
              </Text>
            </Pressable>

            <Text className="text-[11px] text-center text-neutral-500 leading-4 mt-2 px-3">
              {t.billing.trial_disclaimer}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  selected,
  onPress,
  title,
  price,
  monthlyEquivalent,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  monthlyEquivalent?: string;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-white p-4 flex-row items-center"
      style={{
        borderWidth: 2,
        borderColor: selected ? '#C76F4A' : '#F2DCCB',
      }}
    >
      <View
        className="h-5 w-5 rounded-full mr-3"
        style={{
          borderWidth: 2,
          borderColor: selected ? '#C76F4A' : '#9CA3AF',
          backgroundColor: selected ? '#C76F4A' : 'transparent',
        }}
      />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-[15px] font-bold text-neutral-900">{title}</Text>
          {badge ? (
            <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: '#FFF6E1' }}>
              <Text className="text-[10px] font-bold" style={{ color: '#7B5A14' }}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-[14px] text-neutral-700 mt-1">{price}</Text>
        {monthlyEquivalent ? (
          <Text className="text-[11px] text-neutral-500 mt-0.5">{monthlyEquivalent}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <View className="flex-row items-start gap-2 py-1.5">
      <Text className="text-[14px]" style={{ color: '#C76F4A' }}>
        ✓
      </Text>
      <Text className="flex-1 text-[14px] leading-5 text-neutral-800">{label}</Text>
    </View>
  );
}
