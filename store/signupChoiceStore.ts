import { create } from 'zustand';

import { type AccountType, EMPTY_SHOP_SIGNUP, type ShopSignupDraft } from '../lib/shopSignup';

// What the sign-up screen has so far, so a Google or Apple sign-up started there keeps
// "shop" and the shop details into the completion screen (D-200). In memory only.
interface SignupChoiceState {
  accountType: AccountType;
  shopDraft: ShopSignupDraft;
  setAccountType: (accountType: AccountType) => void;
  setShopDraft: (shopDraft: ShopSignupDraft) => void;
  reset: () => void;
}

export const useSignupChoiceStore = create<SignupChoiceState>((set) => ({
  accountType: 'personal',
  shopDraft: EMPTY_SHOP_SIGNUP,
  setAccountType: (accountType) => set({ accountType }),
  setShopDraft: (shopDraft) => set({ shopDraft }),
  reset: () => set({ accountType: 'personal', shopDraft: EMPTY_SHOP_SIGNUP }),
}));
