import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SurfaceCard } from '../SurfaceCard';
import { colors, radius, shadows, spacing } from '../../theme/tokens';

export type OdysseyTaskLineTone = 'gold' | 'coral' | 'lavender' | 'sage';

export const ODYSSEY_TASK_LINE_TONES: Record<
  OdysseyTaskLineTone,
  { iconBg: string; icon: string; border: string }
> = {
  gold: { iconBg: '#FFE2A7', icon: '#B27A18', border: 'rgba(229, 183, 97, 0.35)' },
  coral: { iconBg: '#FFD9CB', icon: colors.brandCoral, border: 'rgba(240, 130, 96, 0.26)' },
  lavender: { iconBg: '#E9DEFF', icon: '#6269D9', border: 'rgba(121, 107, 210, 0.24)' },
  sage: { iconBg: '#DDF3D2', icon: '#5C8A48', border: 'rgba(118, 166, 92, 0.26)' },
};

export interface OdysseyTaskLineCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: OdysseyTaskLineTone;
  activeCount: number;
  countLabel: string;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

export function OdysseyTaskLineCard({
  title,
  subtitle,
  icon,
  tone,
  activeCount,
  countLabel,
  onPress,
  accessibilityLabel,
  testID,
}: OdysseyTaskLineCardProps) {
  const toneConfig = ODYSSEY_TASK_LINE_TONES[tone];
  const formattedCount = countLabel.replace('{count}', String(activeCount));

  return (
    <SurfaceCard
      padding={0}
      shadow="none"
      style={[styles.shell, { borderColor: toneConfig.border }]}
      testID={testID}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        onPress={onPress}
        style={styles.pressable}
      >
        <View style={[styles.iconShell, { backgroundColor: toneConfig.iconBg }]}>
          <Ionicons name={icon} size={23} color={toneConfig.icon} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
          <View style={[styles.countChip, { backgroundColor: toneConfig.iconBg }]}>
            <Text style={[styles.countText, { color: toneConfig.icon }]}>{formattedCount}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={19} color={toneConfig.icon} style={styles.chevron} />
      </Pressable>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 118,
    marginBottom: spacing.md,
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: radius['2xl'],
    borderWidth: 1,
    backgroundColor: colors.cardWhiteSolid,
    ...shadows.card,
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  pressable: {
    minHeight: 116,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius['2xl'],
  },
  iconShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg - 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.textMain,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
  },
  countChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.md - 2,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
  },
  chevron: {
    marginLeft: spacing.md - 2,
  },
});
