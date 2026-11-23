import type { MerchantCategory } from '../features/merchants/types';

export type AccountType = 'personal' | 'shop';

// A shop signs up with its opening month and category instead of a birth date, and the
// person confirms they are an adult and may act for the shop (D-200).
export interface ShopSignupDraft {
  openedYear: string;
  openedMonth: number | null;
  category: MerchantCategory | null;
  categoryOther: string;
  ownerIsAdult: boolean;
}

export interface ShopSignupPayload {
  opened_year: number;
  opened_month: number;
  category: MerchantCategory;
  category_other: string | null;
  owner_is_adult: true;
}

export const EMPTY_SHOP_SIGNUP: ShopSignupDraft = {
  openedYear: '',
  openedMonth: null,
  category: null,
  categoryOther: '',
  ownerIsAdult: false,
};

/** A month the shop opened in: four-digit year, not before 1800, at most a year ahead
 *  (Google takes opening dates up to a year ahead; so does the server). */
export function openedMonthValid(year: string, month: number | null, today: Date = new Date()): boolean {
  const text = year.trim();
  if (!/^\d{4}$/.test(text) || month === null || month < 1 || month > 12) return false;
  const value = Number(text);
  if (value < 1800) return false;
  const limit = (today.getFullYear() + 1) * 12 + today.getMonth() + 1;
  return value * 12 + month <= limit;
}

/** The sign-up payload, or null while something is missing. */
export function shopSignupPayload(draft: ShopSignupDraft, today: Date = new Date()): ShopSignupPayload | null {
  if (!openedMonthValid(draft.openedYear, draft.openedMonth, today) || draft.openedMonth === null) return null;
  if (!draft.category) return null;
  const other = draft.categoryOther.trim();
  if (draft.category === 'other' && !other) return null;
  if (!draft.ownerIsAdult) return null;
  return {
    opened_year: Number(draft.openedYear.trim()),
    opened_month: draft.openedMonth,
    category: draft.category,
    category_other: draft.category === 'other' ? other : null,
    owner_is_adult: true,
  };
}

/** "kiezprints.de" -> "https://kiezprints.de"; a link that already has a scheme is left as typed. */
export function normalizeShopLink(value: string): string {
  const text = value.trim();
  if (!text || /^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return text;
  return `https://${text}`;
}
