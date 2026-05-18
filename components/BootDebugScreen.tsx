import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/tokens';

interface BootDebugScreenProps {
  phase: string;
  log: string[];
}

/**
 * Renders during the brief window between module-load and first-screen-mount.
 * Looks like the splash so a healthy boot is visually seamless — but on a
 * hung boot, the tiny phase text at the bottom reveals exactly which step
 * failed (impossible to diagnose otherwise on Windows without Mac/Console).
 *
 * Imports nothing native-risky (no Maps, no Reanimated, no SecureStore) so
 * this screen renders even if the rest of the app's native chain is broken.
 */
export function BootDebugScreen({ phase, log }: BootDebugScreenProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/splash-icon.png')}
        style={styles.icon}
        contentFit="contain"
      />
      <View style={styles.footer}>
        <Text style={styles.phase}>{phase}</Text>
        {log.length > 1 ? (
          <ScrollView style={styles.logScroll}>
            {log.slice(-6).map((line, i) => (
              <Text key={i} style={styles.logLine}>
                {line}
              </Text>
            ))}
          </ScrollView>
        ) : null}
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
  },
  icon: {
    width: 200,
    height: 200,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  phase: {
    fontSize: 11,
    color: colors.textSubtle,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  logScroll: {
    maxHeight: 84,
    marginTop: 6,
    alignSelf: 'stretch',
  },
  logLine: {
    fontSize: 9,
    color: colors.textSubtle,
    textAlign: 'center',
    fontFamily: 'Courier',
    lineHeight: 12,
  },
});
