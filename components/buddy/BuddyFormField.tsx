import { StyleSheet, Text, View } from 'react-native';

import { KeyboardSafeTextInput } from '../KeyboardSafeTextInput';
import { colors, radius, spacing, typography } from '../../theme/tokens';

// Labelled input used across the Buddy composer. The optional hint is what
// tells a first-time poster what belongs in the box even outside the tour.
export interface BuddyFormFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
  maxLength?: number;
  hint?: string;
}

export function BuddyFormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  maxLength = 120,
  hint,
}: BuddyFormFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <KeyboardSafeTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={[styles.input, multiline ? styles.bodyInput : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  fieldHint: {
    ...typography.caption,
    marginTop: -spacing.xs,
    color: colors.textSubtle,
  },
  input: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.lineWarm,
    backgroundColor: '#FFFBF7',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textMain,
    fontSize: 15,
  },
  bodyInput: {
    minHeight: 124,
    textAlignVertical: 'top',
  },
});
