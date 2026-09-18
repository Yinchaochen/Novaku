import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { useAuthStore } from '../../store/authStore';
import { useSignInPromptStore } from '../../store/signInPromptStore';
import { AUTH_FORM_MAX_WIDTH } from '../../theme/layout';
import { colors } from '../../theme/tokens';
import { LoginForm } from './LoginForm';

/**
 * Sign-in as a sheet over the page, not a page of its own (D-151).
 *
 * lisum, 2026-09-18: 登录也是一个浮窗而不是一整个页面. A reader who was
 * browsing the wall and pressed save should still see the wall behind the
 * form, and land back on it — with the save done — when they are in.
 *
 * Mounted once at the root and driven by signInPromptStore, so any control in
 * the app can ask for it without knowing where it lives.
 */
export function SignInSheet() {
  const { t } = useLanguage();
  const visible = useSignInPromptStore((state) => state.visible);
  const close = useSignInPromptStore((state) => state.close);
  const resolve = useSignInPromptStore((state) => state.resolve);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { height } = useWindowDimensions();

  // Auth landing is the signal to close — whichever way it landed: password,
  // Google or Apple. The held action runs after, against a signed-in store.
  useEffect(() => {
    if (visible && isAuthenticated) resolve();
  }, [visible, isAuthenticated, resolve]);

  // Mounted only while open: on the web a Modal's layer is created when it
  // mounts, so one mounted at app start sat under any sheet opened later —
  // the post detail covered it and a guest's tap on "comment" did nothing.
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          // Veiled, not blacked out — the same treatment as the detail sheet,
          // so the page the reader was on stays recognisable behind the form.
          backgroundColor: 'rgba(59, 42, 34, 0.38)',
        }}
      >
        <Pressable
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t.common.cancel}
          testID="auth.sheet.scrim"
        />
        <View
          testID="auth.sheet"
          style={{
            width: '100%',
            maxWidth: AUTH_FORM_MAX_WIDTH,
            maxHeight: height - 48,
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: '#FFFAF2',
            shadowColor: '#7A4A2C',
            shadowOpacity: 0.22,
            shadowRadius: 36,
            shadowOffset: { width: 0, height: 16 },
            elevation: 14,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 26 }}
          >
            <LoginForm variant="modal" onLeave={close} />
          </ScrollView>
          <Pressable
            onPress={close}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t.common.cancel}
            testID="auth.sheet.close"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(98, 57, 40, 0.06)',
            }}
          >
            <Ionicons name="close" size={20} color={colors.textBrown} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
