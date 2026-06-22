import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { GlassCard } from '../../components/GlassCard';
import { GradientButton } from '../../components/GradientButton';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/Pill';
import { Screen } from '../../components/Screen';

/**
 * Component catalog — renders the reusable primitives in the states that break
 * layout (long German, loading, disabled). Open it in the deployed web gallery
 * (or `npm run web` → /dev/components) and eyeball before shipping a UI change.
 * Dev-only: English, out of the i18n pipeline (same convention as button-audit).
 */

const LONG_DE = 'Aufenthaltstitel-Verlängerung';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="rounded-3xl bg-white p-5">
      <Text className="text-xs font-extrabold uppercase tracking-wide text-text-subtle">{title}</Text>
      <View className="mt-4 gap-3">{children}</View>
    </View>
  );
}

export default function ComponentsGallery() {
  return (
    <Screen
      header={<PageHeader title="Components" subtitle="States to eyeball before shipping a UI change" />}
      scroll
      bottomGap={28}
      contentClassName="px-5 gap-4"
    >
      <Section title="GradientButton — variants">
        <View className="flex-row flex-wrap items-center gap-3">
          <GradientButton label="Primary" variant="primary" />
          <GradientButton label="Secondary" variant="secondary" />
          <GradientButton label="Glass" variant="glass" />
          <GradientButton label="Ghost" variant="ghost" />
        </View>
        <View className="flex-row flex-wrap items-center gap-3">
          <GradientButton label="Loading" loading />
          <GradientButton label="Disabled" disabled />
          <GradientButton label={LONG_DE} variant="primary" />
        </View>
        <GradientButton label="Full-width primary CTA" fullWidth />
      </Section>

      <Section title="Pill — tones">
        <View className="flex-row flex-wrap items-center gap-2">
          <Pill label="coral" tone="coral" />
          <Pill label="peach" tone="peach" />
          <Pill label="lavender" tone="lavender" />
          <Pill label="sage" tone="sage" />
          <Pill label="neutral" tone="neutral" />
          <Pill label="cream" tone="cream" />
        </View>
      </Section>

      <Section title="GlassCard — tones + long copy">
        {(['white', 'cream', 'lavender'] as const).map((tone) => (
          <GlassCard key={tone} tone={tone}>
            <Text className="text-sm font-bold text-text-main">tone = {tone}</Text>
            <Text className="mt-1 text-sm leading-6 text-text-secondary">{LONG_DE} — body copy stress test.</Text>
          </GlassCard>
        ))}
      </Section>
    </Screen>
  );
}
