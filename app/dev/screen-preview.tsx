import { Text, View } from 'react-native';

import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';

/**
 * Dev-only gallery for the <Screen> primitive and the "render before done"
 * loop (GOTCHAS §9). Open it with `npm run web` → /dev/screen-preview and eyeball
 * every state below. Copy this file as the template when building a new screen:
 * render the new screen here in all its states, screenshot, fix, THEN ship.
 *
 * Dev route under app/dev/ — not a user surface, so copy stays in English and
 * out of the i18n pipeline (same convention as button-audit.tsx).
 */

const LONG_DE =
  'Aufenthaltserlaubnis-Verlängerungsbescheinigung beim Bürgeramt Friedrichshain-Kreuzberg — Terminbestätigung erforderlich.';

function Card({ children }: { children: React.ReactNode }) {
  return <View className="rounded-3xl bg-white p-5">{children}</View>;
}

export default function ScreenPreview() {
  return (
    <Screen
      header={<PageHeader title="Screen preview" subtitle="States to verify before calling a UI change done" />}
      scroll
      tabBar
      bottomGap={28}
      contentClassName="px-5 gap-4"
    >
      <Card>
        <Text className="text-base font-extrabold text-text-main">Normal — short EN</Text>
        <Text className="mt-2 text-sm leading-6 text-text-secondary">
          Header above clears the notch; this body clears the floating tab bar via tabBar.
        </Text>
      </Card>

      <Card>
        <Text className="text-base font-extrabold text-text-main">Long copy — German overflow</Text>
        <Text className="mt-2 text-sm leading-6 text-text-secondary">{LONG_DE}</Text>
      </Card>

      <Card>
        <Text className="text-base font-extrabold text-text-main">Empty state</Text>
        <View className="mt-3 items-center rounded-2xl bg-surface-warm py-8">
          <Text className="text-sm text-text-subtle">Nothing here yet</Text>
        </View>
      </Card>

      <Card>
        <Text className="text-base font-extrabold text-text-main">Loading skeleton</Text>
        <View className="mt-3 gap-2">
          <View className="h-4 w-3/4 rounded-full bg-bg-warm" />
          <View className="h-4 w-1/2 rounded-full bg-bg-warm" />
        </View>
      </Card>

      <View className="rounded-3xl border border-border-warm p-5">
        <Text className="text-xs font-extrabold uppercase tracking-wide text-text-subtle">
          Checklist (GOTCHAS §9)
        </Text>
        <Text className="mt-2 text-sm leading-6 text-text-secondary">
          normal · long German · empty · loading · own vs other content. No overlap with notch,
          tab bar, or keyboard. All tap targets ≥ 44dp.
        </Text>
      </View>
    </Screen>
  );
}
