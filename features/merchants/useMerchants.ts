import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../lib/api';
import { addSentryBreadcrumb } from '../../lib/sentry';
import { useAuthStore } from '../../store/authStore';
import type { AuthUser } from '../auth/useAuth';
import type { BecomeMerchantInput, Merchant, Product, ProductCard, ProductInput } from './types';

export * from './types';

export function useMerchantSignupStatus(enabled: boolean) {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: ['merchant', 'signup-status', user?.id],
    queryFn: async () => {
      const res = await api.get('/merchants/signup-status');
      return Boolean(res.data.data.enabled);
    },
    enabled: enabled && Boolean(user),
    staleTime: 5 * 60_000,
  });
}

// Returns the refreshed user without storing it: the server marks onboarding done, and
// storing it here would close the setup modal before its last step (the caller stores it).
export function useBecomeMerchant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BecomeMerchantInput) => {
      addSentryBreadcrumb('merchant.become');
      await api.post('/merchants/me', input);
      const me = await api.get('/auth/me');
      return me.data.data as AuthUser;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['merchant'] });
    },
  });
}

export interface ShopSearchResult {
  user_id: string;
  place_name: string;
  address: string | null;
  avatar_url: string | null;
  category: Merchant['category'];
  category_other: string | null;
  product_count: number;
}

export function useShopSearch(query: string, enabled: boolean) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['merchant', 'search', trimmed],
    queryFn: async () => {
      const res = await api.get('/merchants/search', { params: { q: trimmed } });
      return res.data.data.items as ShopSearchResult[];
    },
    enabled: enabled && trimmed.length >= 2,
    staleTime: 30_000,
    retry: false,
  });
}

export function useShop(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['merchant', userId],
    queryFn: async () => {
      const res = await api.get(`/merchants/${userId}`);
      return res.data.data as Merchant;
    },
    enabled: Boolean(userId),
  });
}

export function useShopProducts(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['merchant', userId, 'products'],
    queryFn: async () => {
      const res = await api.get(`/merchants/${userId}/products`);
      return res.data.data.items as ProductCard[];
    },
    enabled: Boolean(userId),
  });
}

export function useUpdateShop() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Merchant, 'category' | 'category_other' | 'opening_hours' | 'phone' | 'impressum_url'>>) => {
      const res = await api.patch('/merchants/me', patch);
      return res.data.data as Merchant;
    },
    onSuccess: (shop) => {
      queryClient.setQueryData(['merchant', userId], shop);
    },
  });
}

export function useProduct(productId: string | null | undefined) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const res = await api.get(`/products/${productId}`);
      return res.data.data as Product;
    },
    enabled: Boolean(productId),
  });
}

export function useProductReviews(productId: string | null | undefined) {
  return useQuery({
    queryKey: ['product', productId, 'reviews'],
    queryFn: async () => {
      const res = await api.get(`/community/products/${productId}/posts`, { params: { limit: 20 } });
      return res.data.data.items as Array<Record<string, unknown> & { id: string }>;
    },
    enabled: Boolean(productId),
  });
}

function useInvalidateShop() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['merchant', userId] });
    void queryClient.invalidateQueries({ queryKey: ['merchant', 'me'] });
  };
}

export function useCreateProduct() {
  const invalidate = useInvalidateShop();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProductInput) => {
      addSentryBreadcrumb('merchant.product.create');
      const res = await api.post('/merchants/me/products', input);
      return res.data.data as Product;
    },
    onSuccess: (product) => {
      queryClient.setQueryData(['product', product.id], product);
      invalidate();
    },
  });
}

export function useUpdateProduct(productId: string) {
  const invalidate = useInvalidateShop();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProductInput> & { clear_price?: boolean; status?: 'active' | 'hidden' }) => {
      const res = await api.patch(`/products/${productId}`, input);
      return res.data.data as Product;
    },
    onSuccess: (product) => {
      queryClient.setQueryData(['product', product.id], product);
      invalidate();
    },
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidateShop();
  return useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/products/${productId}`);
    },
    onSuccess: invalidate,
  });
}

export function useToggleProductSave(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (save: boolean) => {
      if (save) {
        await api.put(`/products/${productId}/save`);
      } else {
        await api.delete(`/products/${productId}/save`);
      }
      return save;
    },
    onMutate: async (save) => {
      await queryClient.cancelQueries({ queryKey: ['product', productId] });
      const previous = queryClient.getQueryData<Product>(['product', productId]);
      if (previous) {
        queryClient.setQueryData<Product>(['product', productId], { ...previous, viewer_saved: save });
      }
      return { previous };
    },
    onError: (_error, _save, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['product', productId], context.previous);
      }
    },
  });
}
