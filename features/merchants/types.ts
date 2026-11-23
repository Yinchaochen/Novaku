// Shapes of the /merchants and /products endpoints (D-195); no imports with side effects, so lib/ can use them.
import type { AuthUser } from '../auth/useAuth';

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type OpeningRange = { open: string; close: string };
export type OpeningHours = Record<Weekday, OpeningRange[]>;

export const MERCHANT_CATEGORIES = ['restaurant', 'cafe', 'bakery', 'market', 'service', 'other'] as const;
export type MerchantCategory = (typeof MERCHANT_CATEGORIES)[number];

// A shop people can visit (found on the map) or an online shop (a website), D-200.
export type ShopKind = 'physical' | 'online';

export interface Merchant {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  kind?: ShopKind;
  place_id: string | null;
  place_name: string;
  website_url?: string | null;
  opened_year?: number | null;
  opened_month?: number | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  category: MerchantCategory;
  category_other: string | null;
  opening_hours: OpeningHours;
  timezone: string;
  phone: string | null;
  impressum_url: string | null;
  open_now: boolean;
  today_hours: OpeningRange[];
  product_count: number;
}

export interface MerchantSummary {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  place_name: string;
  address: string | null;
  category: MerchantCategory;
  category_other: string | null;
  open_now: boolean;
  today_hours: OpeningRange[];
}

export interface ProductCard {
  id: string;
  merchant_user_id: string;
  name: string;
  price_gross_cents: number | null;
  currency: string;
  cover_url: string | null;
  status: 'active' | 'hidden';
}

export interface ProductMedia {
  media_url: string;
  thumb_url?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface Product {
  id: string;
  merchant_user_id: string;
  name: string;
  price_gross_cents: number | null;
  currency: string;
  description: string | null;
  status: 'active' | 'hidden';
  media_items: ProductMedia[];
  merchant: MerchantSummary;
  review_count: number;
  viewer_saved: boolean;
  viewer_is_owner: boolean;
  created_at: string;
  updated_at: string;
}

export interface BecomeMerchantInput {
  kind: ShopKind;
  place_id: string | null;
  place_name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  impressum_url: string | null;
  category: MerchantCategory;
  category_other: string | null;
  opening_hours: OpeningHours;
  phone: string | null;
  timezone: string | null;
  // Left out when the shop gave it at sign-up (D-200); the server takes that one.
  opened_year?: number | null;
  opened_month?: number | null;
}

// What a shop gave at sign-up instead of a birth date (D-200).
export interface SignupShop {
  opened_year: number;
  opened_month: number;
  category: MerchantCategory;
  category_other: string | null;
}

// What Google has for the shop the owner just found; any of it can be missing.
export interface ShopPlacePrefill {
  opening_hours: OpeningHours | null;
  phone: string | null;
  website_url: string | null;
}

export interface ProductInput {
  name: string;
  price_gross_cents: number | null;
  description: string | null;
  media_items: ProductMedia[];
}

export function isMerchant(user: Pick<AuthUser, 'account_kind'> | null | undefined): boolean {
  return user?.account_kind === 'merchant';
}
