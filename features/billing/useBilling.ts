import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export type BillingPlan = 'monthly' | 'yearly';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | 'paused';

export interface Subscription {
  id: string;
  plan: BillingPlan;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
}

export interface BillingMe {
  is_vianter_plus: boolean;
  subscription: Subscription | null;
}

export function useBillingMe() {
  const user = useAuthStore((s) => s.user);
  return useQuery<BillingMe>({
    queryKey: ['billing', 'me', user?.id],
    queryFn: async () => {
      const res = await api.get('/billing/me');
      return res.data.data as BillingMe;
    },
    enabled: Boolean(user),
  });
}

export function useCheckoutSession() {
  return useMutation({
    mutationFn: async (plan: BillingPlan) => {
      const res = await api.post('/billing/checkout-session', { plan });
      return res.data.data as { url: string };
    },
  });
}

export function usePortalSession() {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post('/billing/portal-session');
      return res.data.data as { url: string };
    },
  });
}

/**
 * Lightweight helper for components that just need to know "is this user paid?"
 * — uses the cached AuthUser. Sync, no fetch.
 */
export function useIsVianterPlus(): boolean {
  return useAuthStore((s) => s.user?.is_vianter_plus ?? false);
}

/**
 * Pricing copy. Kept here so the page + paywall + settings all read from one source.
 */
export const VIANTER_PLUS_PRICING = {
  monthly: { amount: 9.9, currency: 'EUR', period: 'month' },
  yearly: { amount: 99, currency: 'EUR', period: 'year', discountPercent: 17 },
} as const;
