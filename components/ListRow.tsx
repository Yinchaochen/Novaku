import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, Text, View, ViewProps, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../theme/tokens';

type ListRowTone = 'neutral' | 'coral' | 'lavender' | 'sage' | 'gold';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  meta?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: ListRowTone;
  leading?: ReactNode;
  trailing?: ReactNode;
  showChevron?: boolean;
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
}

const TONES: Record<ListRowTone, { bg: string; fg: string }> = {
  neutral: { bg: '#F8EFE7', fg: colors.textMuted },
  coral: { bg: '#FFE1D6', fg: colors.brandCoral },
  lavender: { bg: '#ECE4FF', fg: colors.lavender },
  sage: { bg: '#DFF1D7', fg: '#5C8A48' },
  gold: { bg: '#FFE2A7', fg: '#B27A18' },
};

export function ListRow({
  title,
  subtitle,
  eyebrow,
  meta,
  icon,
  tone = 'neutral',
  leading,
  trailing,
  onPress,
  showChevron,
  disabled = false,
  style,
  testID,
  accessibilityLabel,
}: ListRowProps) {
  const toneConfig = TONES[tone];
  const shouldShowChevron = showChevron ?? Boolean(onPress);
  const content = (
    <>
      {leading ?? (
        icon ? (
          <View style={[styles.iconShell, { backgroundColor: toneConfig.bg }]}>
            <Ionicons name={icon} size={21} color={toneConfig.fg} />
          </View>
        ) : null
      )}
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      ) : null}
      {trailing}
      {shouldShowChevron ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        disabled={disabled}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.row, style, pressed && !disabled ? styles.pressed : null, disabled ? styles.disabled : null]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[styles.row, style, disabled ? styles.disabled : null] as ViewProps['style']}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.cardWhiteSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineSoft,
  },
  iconShell: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSubtle,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textMain,
  },
  subtitle: {
    marginTop: 2,
    ...typography.caption,
    color: colors.textMuted,
  },
  meta: {
    maxWidth: 92,
    ...typography.caption,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.52,
  },
});
