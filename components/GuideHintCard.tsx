import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { FeedbackPressable } from './FeedbackPressable';
import { SurfaceCard } from './SurfaceCard';
import { colors, spacing, typography } from '../theme/tokens';

interface GuideHintCardProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  dismissLabel: string;
  onDismiss: () => void;
  skipLabel?: string;
  onSkipAll?: () => void;
  testID?: string;
}

// D-046 first-value guide hint: a small, dismissible card — never a blocking
// overlay. Rendered at the top of the surface it points at.
export function GuideHintCard({
  icon = 'sparkles-outline',
  title,
  body,
  dismissLabel,
  onDismiss,
  skipLabel,
  onSkipAll,
  testID,
}: GuideHintCardProps) {
  return (
    <SurfaceCard
      tone="cream"
      radiusKey="2xl"
      padding={spacing.lg}
      bordered
      testID={testID}
      style={{ marginBottom: spacing.md }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.md,
            backgroundColor: '#FFE0CC',
          }}
        >
          <Ionicons name={icon} size={20} color={colors.brandCoral} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyStrong, { color: colors.textMain }]}>{title}</Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: 2 }]}>{body}</Text>
          {skipLabel && onSkipAll ? (
            <FeedbackPressable
              accessibilityRole="button"
              accessibilityLabel={skipLabel}
              onPress={onSkipAll}
              style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
              pressedStyle={{ opacity: 0.7 }}
            >
              <Text style={[typography.caption, { color: colors.brandCoral, fontWeight: '700' }]}>
                {skipLabel}
              </Text>
            </FeedbackPressable>
          ) : null}
        </View>
        <FeedbackPressable
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
          onPress={onDismiss}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: -spacing.sm,
            marginRight: -spacing.sm,
          }}
          pressedStyle={{ opacity: 0.7 }}
        >
          <Ionicons name="close" size={18} color={colors.textSubtle} />
        </FeedbackPressable>
      </View>
    </SurfaceCard>
  );
}
