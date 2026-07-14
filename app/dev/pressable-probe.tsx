import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FeedbackPressable } from '../../components/FeedbackPressable';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import { usePressedFeedback } from '../../hooks/usePressedFeedback';

/**
 * On-device probe for GOTCHAS 坑 #7: nativewind v4 css-interop drops
 * `style={({ pressed }) => ...}` output on native (nativewind#1105/#1781),
 * while static styles survive. Each cell below should render as a coral
 * card row (icon | label | chevron). A cell that renders as a bare stacked
 * column with no card shell = the callback path is broken in that context.
 *
 * Cells 1-3 keep the KNOWN-BAD pattern on purpose (allowlisted in
 * verify-ui-system.mjs) so the trigger condition can be observed directly.
 * Dev-only copy stays English and out of the i18n pipeline.
 */

const CARD: object = {
  minHeight: 64,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: '#FFE1D6',
  borderWidth: 1,
  borderColor: 'rgba(240,130,96,0.35)',
};

function CellContent({ label }: { label: string }) {
  return (
    <>
      <View style={styles.iconShell}>
        <Ionicons name="flask-outline" size={18} color="#B23B22" />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#B23B22" />
    </>
  );
}

function Caption({ children }: { children: string }) {
  return <Text style={styles.caption}>{children}</Text>;
}

function HookCell() {
  const [pressed, pressHandlers] = usePressedFeedback();
  return (
    <Pressable {...pressHandlers} style={[CARD, pressed ? styles.pressed : null]}>
      <CellContent label="6. usePressedFeedback hook" />
    </Pressable>
  );
}

export default function PressableProbe() {
  return (
    <Screen
      header={<PageHeader title="Pressable probe" subtitle={`callback vs static · ${Platform.OS}`} />}
      bottomGap={28}
    >
      <ScrollView
        collapsable={false}
        nestedScrollEnabled
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 6, paddingBottom: 40 }}
      >
        <Text style={styles.rule}>
          Every cell must look identical: coral card, icon left, text middle, chevron right.
          A bare stacked column = callback styles dropped in that context.
        </Text>

        <Pressable style={({ pressed }) => [CARD, pressed ? styles.pressed : null]}>
          <CellContent label="1. callback style (known-bad pattern)" />
        </Pressable>
        <Caption>{'Plain Pressable, layout inside ({ pressed }) => [...] — the pre-fix pattern.'}</Caption>

        <SurfaceCard padding={0} shadow="none" style={styles.probeShell}>
          <Pressable style={({ pressed }) => [CARD, pressed ? styles.pressed : null]}>
            <CellContent label="2. callback inside SurfaceCard" />
          </Pressable>
        </SurfaceCard>
        <Caption>Reproduces the OdysseyTaskLineCard structure that broke on 2026-07-13.</Caption>

        <View collapsable={false}>
          <Pressable style={({ pressed }) => [CARD, pressed ? styles.pressed : null]}>
            <CellContent label="3. callback inside collapsable=false" />
          </Pressable>
        </View>
        <Caption>Same wrapper flag as the Odyssey tab ScrollView.</Caption>

        <Pressable style={CARD}>
          <CellContent label="4. static style (control)" />
        </Pressable>
        <Caption>Static style prop — the always-safe control.</Caption>

        <FeedbackPressable style={CARD} pressedStyle={styles.pressed}>
          <CellContent label="5. FeedbackPressable" />
        </FeedbackPressable>
        <Caption>Blessed wrapper: static resting style + pressed state via onPressIn/Out.</Caption>

        <HookCell />
        <Caption>usePressedFeedback directly on a Pressable.</Caption>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rule: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#7A6A5C',
    marginBottom: 10,
  },
  iconShell: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#4A3226',
  },
  pressed: {
    opacity: 0.7,
  },
  probeShell: {
    alignSelf: 'stretch',
  },
  caption: {
    fontSize: 11,
    lineHeight: 15,
    color: '#A08D7D',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});
