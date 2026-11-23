import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, Text, TextInput, type TextStyle, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { MERCHANT_CATEGORIES, type MerchantCategory } from '../../features/merchants/types';
import type { AccountType, ShopSignupDraft } from '../../lib/shopSignup';
import { colors } from '../../theme/tokens';

// "Person or shop" comes first on both sign-up screens (D-200), so the welcome after
// sign-up already knows which one it is.
export function AccountTypeChoice({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (value: AccountType) => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={{ gap: 10 }}>
      {(['personal', 'shop'] as const).map((item) => {
        const active = value === item;
        return (
          <Pressable
            key={item}
            testID={`auth.account-type.${item}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderRadius: 22,
              borderWidth: 2,
              borderColor: active ? colors.brandCoral : 'rgba(98,57,40,0.12)',
              backgroundColor: active ? 'rgba(246,118,115,0.08)' : '#FFFFFF',
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Ionicons
              name={item === 'personal' ? 'person-outline' : 'storefront-outline'}
              size={22}
              color={active ? colors.brandCoral : colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textMain }}>
                {item === 'personal' ? t.merchant.role_personal : t.merchant.role_shop}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 12.5, lineHeight: 18, color: colors.textMuted }}>
                {item === 'personal' ? t.merchant.role_personal_hint : t.merchant.role_shop_hint}
              </Text>
            </View>
            <Ionicons
              name={active ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={active ? colors.brandCoral : '#D1D5DB'}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function monthNames(locale: string): string[] {
  try {
    const format = new Intl.DateTimeFormat(locale, { month: 'short' });
    return Array.from({ length: 12 }, (_, index) => format.format(new Date(2020, index, 1)));
  } catch {
    return Array.from({ length: 12 }, (_, index) => String(index + 1));
  }
}

const DEFAULT_LABEL: TextStyle = { fontSize: 15, fontWeight: '700', color: colors.textMain, marginBottom: 8 };
const DEFAULT_INPUT: TextStyle = {
  borderRadius: 22,
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: 'rgba(98,57,40,0.14)',
  paddingHorizontal: 18,
  paddingVertical: 14,
  fontSize: 15,
  color: colors.textMain,
};

/** The month and year a shop opened (D-200). Shown on the shop page. */
export function OpenedMonthField({
  year,
  month,
  onChange,
  labelStyle = DEFAULT_LABEL,
  inputStyle = DEFAULT_INPUT,
}: {
  year: string;
  month: number | null;
  onChange: (value: { year: string; month: number | null }) => void;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
}) {
  const { t, langCode } = useLanguage();
  const months = useMemo(() => monthNames(langCode), [langCode]);
  return (
    <View>
      <Text style={labelStyle}>{t.merchant.signup_opened_label}</Text>
      <TextInput
        testID="shop.opened-year"
        value={year}
        onChangeText={(value) => onChange({ year: value.replace(/[^0-9]/g, '').slice(0, 4), month })}
        keyboardType="number-pad"
        maxLength={4}
        placeholder={t.merchant.signup_opened_year}
        placeholderTextColor="#A89A92"
        accessibilityLabel={t.merchant.signup_opened_year}
        style={[inputStyle, { width: 130 }]}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {months.map((name, index) => {
          const value = index + 1;
          const active = month === value;
          return (
            <Pressable
              key={value}
              testID={`shop.opened-month.${value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange({ year, month: value })}
              style={{
                minWidth: 58,
                minHeight: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                paddingHorizontal: 12,
                backgroundColor: active ? colors.brandCoral : '#F3EEE8',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFFFFF' : colors.textBrown }}>
                {name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ marginTop: 6, fontSize: 12, lineHeight: 17, color: colors.textMuted }}>
        {t.merchant.signup_opened_hint}
      </Text>
    </View>
  );
}

export function ShopCategoryField({
  category,
  categoryOther,
  onChange,
  labelStyle = DEFAULT_LABEL,
  inputStyle = DEFAULT_INPUT,
}: {
  category: MerchantCategory | null;
  categoryOther: string;
  onChange: (value: { category: MerchantCategory | null; categoryOther: string }) => void;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
}) {
  const { t } = useLanguage();
  return (
    <View>
      <Text style={labelStyle}>{t.merchant.category_label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {MERCHANT_CATEGORIES.map((item) => {
          const active = category === item;
          return (
            <Pressable
              key={item}
              testID={`shop.category.${item}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange({ category: item, categoryOther })}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                borderRadius: 999,
                paddingHorizontal: 16,
                backgroundColor: active ? colors.brandCoral : '#F3EEE8',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: active ? '#FFFFFF' : colors.textBrown }}>
                {t.merchant[`category_${item}`]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {category === 'other' ? (
        <TextInput
          testID="shop.category.other-input"
          value={categoryOther}
          onChangeText={(value) => onChange({ category, categoryOther: value })}
          maxLength={40}
          placeholder={t.merchant.category_other_placeholder}
          placeholderTextColor="#A89A92"
          accessibilityLabel={t.merchant.category_other_placeholder}
          style={[inputStyle, { marginTop: 10 }]}
        />
      ) : null}
    </View>
  );
}

/** What a shop gives instead of a birth date: the month it opened, its category,
 *  and the adult confirmation (D-200). */
export function ShopSignupFields({
  draft,
  onChange,
  labelStyle,
  inputStyle,
}: {
  draft: ShopSignupDraft;
  onChange: (draft: ShopSignupDraft) => void;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
}) {
  const { t } = useLanguage();
  const set = (patch: Partial<ShopSignupDraft>) => onChange({ ...draft, ...patch });

  return (
    <View>
      <OpenedMonthField
        year={draft.openedYear}
        month={draft.openedMonth}
        onChange={({ year, month }) => set({ openedYear: year, openedMonth: month })}
        labelStyle={labelStyle}
        inputStyle={inputStyle}
      />
      <View style={{ marginTop: 18 }}>
        <ShopCategoryField
          category={draft.category}
          categoryOther={draft.categoryOther}
          onChange={({ category, categoryOther }) => set({ category, categoryOther })}
          labelStyle={labelStyle}
          inputStyle={inputStyle}
        />
      </View>

      <Pressable
        testID="auth.shop.adult"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: draft.ownerIsAdult }}
        onPress={() => set({ ownerIsAdult: !draft.ownerIsAdult })}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18, minHeight: 44 }}
      >
        <Ionicons
          name={draft.ownerIsAdult ? 'checkbox' : 'square-outline'}
          size={22}
          color={draft.ownerIsAdult ? colors.brandCoral : colors.textMuted}
        />
        <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: colors.textMain }}>
          {t.merchant.signup_adult_confirm}
        </Text>
      </Pressable>
    </View>
  );
}
