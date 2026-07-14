import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { usePressedFeedback } from '../hooks/usePressedFeedback';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { SurfaceCard } from './SurfaceCard';

type StateBlockTone = 'neutral' | 'danger' | 'success' | 'lavender';

export interface StateBlockProps {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: StateBlockTone;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TONES: Record<StateBlockTone, { bg: string; fg: string; surface: 'cream' | 'white' | 'lavender' | 'sage' }> = {
  neutral: { bg: '#F8EFE7', fg: colors.textMuted, surface: 'cream' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, surface: 'white' },
  success: { bg: colors.successSoft, fg: colors.success, surface: 'sage' },
  lavender: { bg: '#ECE4FF', fg: colors.lavender, surface: 'lavender' },
};

export function StateBlock({
  title,
  message,
  icon = 'sparkles-outline',
  tone = 'neutral',
  actionLabel,
  onAction,
  loading = false,
  style,
  testID,
}: StateBlockProps) {
  const toneConfig = TONES[tone];
  const [pressed, pressHandlers] = usePressedFeedback();
  return (
    <SurfaceCard tone={toneConfig.surface} shadow="none" style={[styles.shell, style]} testID={testID}>
      <View style={[styles.iconShell, { backgroundColor: toneConfig.bg }]}>
        {loading ? <ActivityIndicator color={toneConfig.fg} /> : <Ionicons name={icon} size={24} color={toneConfig.fg} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          {...pressHandlers}
          style={[styles.action, pressed ? styles.actionPressed : null]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </SurfaceCard>
  );
}

export function EmptyState(props: Omit<StateBlockProps, 'tone' | 'icon' | 'loading'>) {
  return <StateBlock icon="file-tray-outline" tone="neutral" {...props} />;
}

export function LoadingState(props: Omit<StateBlockProps, 'tone' | 'icon' | 'loading'>) {
  return <StateBlock icon="sparkles-outline" tone="lavender" loading {...props} />;
}

export function ErrorState(props: Omit<StateBlockProps, 'tone' | 'icon' | 'loading'>) {
  return <StateBlock icon="warning-outline" tone="danger" {...props} />;
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  iconShell: {
    width: 58,
    height: 58,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.subheading,
    color: colors.textMain,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.lg,
    minHeight: 42,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandCoral,
  },
  actionPressed: {
    opacity: 0.86,
  },
  actionLabel: {
    ...typography.bodyStrong,
    color: colors.cardWhiteSolid,
  },
});
