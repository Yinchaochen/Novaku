import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export type ToastTone = 'success' | 'info';

export interface ToastMessage {
  id: number;
  text: string;
  tone?: ToastTone;
  durationMs?: number;
}

export function Toast({ message, onDismiss }: { message: ToastMessage | null; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        onDismiss();
      });
    }, message.durationMs ?? 2200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message?.id]);

  if (!message) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity }]}>
      <View style={styles.pill}>
        {message.tone === 'success' ? (
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
        ) : (
          <Ionicons name="information-circle-outline" size={16} color="#FFFFFF" />
        )}
        <Text style={styles.text} numberOfLines={3}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 96,
    alignItems: 'center',
    zIndex: 200,
  },
  pill: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(17,17,17,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
});
