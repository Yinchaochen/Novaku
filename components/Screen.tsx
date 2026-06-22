import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getTabBarHeight } from '../theme/layout';
import { AppBackground } from './AppBackground';

/**
 * Screen — the layout primitive every route screen composes from.
 *
 * It bakes in the four invariants that screens kept hand-rolling (and getting
 * wrong): ambient background, top safe-area inset, bottom clearance over the
 * floating tab bar, and keyboard avoidance. Compose it instead of re-deriving
 * SafeArea + padding per file. See `docs/MOBILE_PLATFORM_GOTCHAS.md` §9.
 *
 * Top inset note: it reads `useSafeAreaInsets()` (root SafeAreaProvider), which
 * is the value GOTCHAS §坑1/§坑2 prove is reliable on iOS 26 — including inside
 * a Modal, where `<SafeAreaView>` is not. So `<Screen>` is safe to reuse for
 * full-screen Modal bodies too.
 */

type Background = 'default' | 'splash' | 'auth' | 'none';

interface ScreenProps {
  children: ReactNode;
  /** Fixed header rendered above the (optionally scrolling) body. It owns its
   *  own top inset — pass `<PageHeader/>`. When set, `topInset` is ignored. */
  header?: ReactNode;
  /** Wrap the body in a ScrollView. Default false (fixed flex container). */
  scroll?: boolean;
  /** Apply the top safe-area inset to the body. Leave false when using a
   *  header (it handles the inset). Set true for header-less screens. */
  topInset?: boolean;
  /** Reserve bottom space for the floating tab bar. Set true on the 5 tab
   *  screens so content / FABs never sit under the bar. */
  tabBar?: boolean;
  /** Wrap in KeyboardAvoidingView — for screens with text inputs. */
  keyboard?: boolean;
  /** Ambient background. 'none' = transparent (a parent already paints one). */
  background?: Background;
  /** NativeWind classes for the body container (padding, gap, …). */
  contentClassName?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** Extra breathing room below content, above the tab bar / home indicator. */
  bottomGap?: number;
  testID?: string;
}

export function Screen({
  children,
  header,
  scroll = false,
  topInset = false,
  tabBar = false,
  keyboard = false,
  background = 'default',
  contentClassName,
  contentStyle,
  bottomGap = 0,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const paddingTop = header ? 0 : topInset ? insets.top : 0;
  const paddingBottom =
    (tabBar ? getTabBarHeight(insets.bottom) : insets.bottom) + bottomGap;

  const body = scroll ? (
    <ScrollView
      testID={testID}
      className="flex-1"
      contentContainerClassName={contentClassName}
      contentContainerStyle={[{ paddingTop, paddingBottom }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      testID={testID}
      className={contentClassName}
      style={[{ flex: 1, paddingTop, paddingBottom }, contentStyle]}
    >
      {children}
    </View>
  );

  const inner = (
    <>
      {header}
      {body}
    </>
  );

  const framed = keyboard ? (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {inner}
    </KeyboardAvoidingView>
  ) : (
    inner
  );

  if (background === 'none') {
    return <View className="flex-1">{framed}</View>;
  }

  return <AppBackground variant={background}>{framed}</AppBackground>;
}

export default Screen;
