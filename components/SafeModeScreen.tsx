import Constants from 'expo-constants';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/tokens';

interface SafeModeScreenProps {
  failureCount: number;
  onRetry: () => void;
}

/**
 * Lyft-style Safe Mode fallback. Rendered when the previous N boots failed
 * before reaching the first screen. Imports nothing heavy (no Maps, no
 * Reanimated, no router) so we know it can render even when the rest of
 * the app cannot. The whole purpose is: never show a blank white screen,
 * always show *something* the user (and an App Store reviewer) can read.
 */
export function SafeModeScreen({ failureCount, onRetry }: SafeModeScreenProps) {
  const version = Constants.expoConfig?.version ?? 'unknown';
  const runtime = Constants.expoConfig?.runtimeVersion ?? 'unknown';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>We hit a snag</Text>
        <Text style={styles.body}>
          Postervia failed to start the last few times. We've recorded the
          issue and our team is looking into it.
        </Text>

        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>

        <View style={styles.meta}>
          <Text style={styles.metaLine}>Version {String(version)}</Text>
          <Text style={styles.metaLine}>Runtime {String(runtime)}</Text>
          <Text style={styles.metaLine}>Failed boots: {failureCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.cardWhiteSolid,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.lineWarm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.brandCoral,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  meta: {
    borderTopWidth: 1,
    borderTopColor: colors.lineSofter,
    paddingTop: 16,
  },
  metaLine: {
    fontSize: 12,
    color: colors.textSubtle,
    marginBottom: 4,
  },
});
