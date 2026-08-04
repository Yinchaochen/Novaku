import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BuddyPricingMode } from '../../features/buddyPosts/pricing';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { KeyboardSafeTextInput } from '../KeyboardSafeTextInput';
import { Pill } from '../Pill';
import { SurfaceCard } from '../SurfaceCard';

type BuddyCurrency = 'EUR' | 'USD';

interface BuddyPriceFieldProps {
  priceText: string;
  currency: BuddyCurrency;
  mode: BuddyPricingMode;
  isComplete: boolean;
  amountPlaceholder: string;
  fixedLabel: string;
  freeLabel: string;
  negotiableLabel: string;
  onPriceTextChange: (value: string) => void;
  onCurrencyChange: (value: BuddyCurrency) => void;
  onModeChange: (value: BuddyPricingMode) => void;
}

export function BuddyPriceField({
  priceText,
  currency,
  mode,
  isComplete,
  amountPlaceholder,
  fixedLabel,
  freeLabel,
  negotiableLabel,
  onPriceTextChange,
  onCurrencyChange,
  onModeChange,
}: BuddyPriceFieldProps) {
  return (
    <SurfaceCard style={styles.card}>
      <View style={[styles.priceRow, !isComplete ? styles.priceRequired : null]}>
        <Text style={styles.currencySymbol}>{currency === 'EUR' ? '€' : '$'}</Text>
        <KeyboardSafeTextInput
          accessibilityLabel={fixedLabel}
          value={priceText}
          onChangeText={onPriceTextChange}
          disabled={mode === 'free'}
          keyboardType="decimal-pad"
          placeholder={amountPlaceholder}
          placeholderTextColor={colors.textSubtle}
          containerStyle={{ flex: 1, minWidth: 70 }}
          style={styles.priceInput}
        />
        {(['EUR', 'USD'] as const).map((code) => (
          <Pressable key={code} disabled={mode === 'free'} onPress={() => onCurrencyChange(code)}>
            <Pill label={code} tone={currency === code ? 'lavender' : 'neutral'} size="xs" />
          </Pressable>
        ))}
      </View>
      <View accessibilityRole="radiogroup" style={styles.priceModes}>
        {(['fixed', 'free', 'negotiable'] as const).map((option) => {
          const active = mode === option;
          const label = option === 'fixed' ? fixedLabel : option === 'free' ? freeLabel : negotiableLabel;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => {
                onModeChange(option);
                if (option === 'free') onPriceTextChange('');
              }}
              style={[styles.priceMode, active ? styles.priceModeActive : null]}
            >
              <Ionicons
                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={active ? colors.brandCoral : colors.textSubtle}
              />
              <Text style={[styles.priceModeText, active ? styles.priceModeTextActive : null]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  priceRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineWarm,
    backgroundColor: '#FFFBF7',
    paddingHorizontal: spacing.md,
  },
  priceRequired: {
    borderColor: 'rgba(246,118,115,0.45)',
  },
  currencySymbol: {
    ...typography.subheading,
    color: colors.textBrown,
  },
  priceInput: {
    flex: 1,
    minWidth: 70,
    color: colors.textMain,
    fontSize: 15,
  },
  priceModes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  priceMode: {
    flexBasis: 95,
    flexGrow: 1,
    minWidth: 95,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineSoft,
    paddingHorizontal: spacing.md,
  },
  priceModeActive: {
    borderColor: 'rgba(246,118,115,0.38)',
    backgroundColor: '#FFF0EA',
  },
  priceModeText: {
    ...typography.caption,
    flex: 1,
    minWidth: 0,
    color: colors.textMuted,
    fontWeight: '700',
  },
  priceModeTextActive: {
    color: colors.brandDeep,
  },
});
