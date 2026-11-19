import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton } from '../../components/GradientButton';
import { Screen } from '../../components/Screen';
import { SettingsHeader } from '../../components/SettingsRow';
import { OpeningHoursEditor } from '../../components/merchant/OpeningHoursEditor';
import { useLanguage } from '../../context/LanguageContext';
import {
  MERCHANT_CATEGORIES,
  type MerchantCategory,
  type OpeningHours,
  useShop,
  useUpdateShop,
} from '../../features/merchants/useMerchants';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/tokens';

const FIELD = {
  minHeight: 48,
  borderWidth: 2,
  borderColor: '#E5E7EB',
  borderRadius: 999,
  paddingHorizontal: 18,
  fontSize: 15,
  color: colors.textMain,
  backgroundColor: '#FFFFFF',
} as const;

// The owner edits what the setup modal asked for, plus the Impressum link (§ 5 DDG).
export default function ShopEditScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.user?.id);
  const shop = useShop(userId);
  const update = useUpdateShop();
  const [category, setCategory] = useState<MerchantCategory>('other');
  const [categoryOther, setCategoryOther] = useState('');
  const [hours, setHours] = useState<OpeningHours | null>(null);
  const [phone, setPhone] = useState('');
  const [impressum, setImpressum] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!shop.data || hours) return;
    setCategory(shop.data.category);
    setCategoryOther(shop.data.category_other ?? '');
    setHours(shop.data.opening_hours);
    setPhone(shop.data.phone ?? '');
    setImpressum(shop.data.impressum_url ?? '');
  }, [shop.data, hours]);

  const save = async () => {
    const link = impressum.trim();
    if (link && !link.toLowerCase().startsWith('https://')) {
      setMessage(t.merchant.impressum_invalid);
      return;
    }
    if (!hours) return;
    setMessage(null);
    try {
      await update.mutateAsync({
        category,
        category_other: category === 'other' ? categoryOther.trim() || null : null,
        opening_hours: hours,
        phone: phone.trim() || null,
        impressum_url: link || null,
      });
      router.back();
    } catch {
      setMessage(t.common.error);
    }
  };

  return (
    <Screen
      scroll
      keyboard
      header={
        <View style={{ paddingTop: insets.top, backgroundColor: colors.bgCream }}>
          <SettingsHeader title={t.merchant.edit_shop} onBack={() => router.back()} />
        </View>
      }
      contentStyle={{ paddingHorizontal: 20, paddingTop: 8, gap: 18 }}
      bottomGap={24}
      testID="shop.edit.screen"
    >
      {!hours ? (
        <ActivityIndicator color={colors.brandCoral} style={{ marginTop: 32 }} />
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>{t.merchant.category_label}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MERCHANT_CATEGORIES.map((item) => {
                const active = item === category;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setCategory(item)}
                    style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center', backgroundColor: active ? '#FF9F6E' : '#F3F4F6' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#FFFFFF' : '#374151' }}>{t.merchant[`category_${item}`]}</Text>
                  </Pressable>
                );
              })}
            </View>
            {category === 'other' ? (
              <TextInput
                accessibilityLabel={t.merchant.category_other_placeholder}
                value={categoryOther}
                onChangeText={setCategoryOther}
                maxLength={40}
                placeholder={t.merchant.category_other_placeholder}
                placeholderTextColor={colors.textSubtle}
                style={FIELD}
              />
            ) : null}
          </View>

          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>{t.merchant.hours_label}</Text>
            <OpeningHoursEditor value={hours} onChange={setHours} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>
              {t.merchant.phone_label} <Text style={{ fontSize: 14, fontWeight: '400', color: colors.textMuted }}>{t.merchant.optional}</Text>
            </Text>
            <TextInput accessibilityLabel={t.merchant.phone_label} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={40} style={FIELD} />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textMain }}>{t.merchant.impressum_label}</Text>
            <Text style={{ fontSize: 13, lineHeight: 20, color: colors.textMuted }}>{t.merchant.impressum_hint}</Text>
            <TextInput
              accessibilityLabel={t.merchant.impressum_label}
              value={impressum}
              onChangeText={setImpressum}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://"
              placeholderTextColor={colors.textSubtle}
              style={FIELD}
            />
          </View>

          {message ? <Text style={{ textAlign: 'center', fontSize: 14, color: colors.textDanger }}>{message}</Text> : null}
          <GradientButton label={t.common.save} onPress={() => void save()} loading={update.isPending} disabled={update.isPending} fullWidth size="lg" />
        </>
      )}
    </Screen>
  );
}
