import { Link, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';

/**
 * Dev gallery hub: the verification surface for rendered UI states.
 * Dev-only copy stays English and out of the i18n pipeline.
 */

// expo-router typedRoutes only regenerates on `expo start`; sibling dev routes
// added in the same change can be missing from generated types while resolving
// at runtime. Widen here so a stale dev-only table cannot block tsc.
const devRoute = (p: string) => p as unknown as Href;

const PAGES: { href: string; title: string; blurb: string }[] = [
  { href: '/dev/product-guide', title: 'First-value guide', blurb: 'Guide hint cards and settings re-entry in all 6 states' },
  { href: '/dev/city-location', title: 'City and location', blurb: 'Real city selection, privacy, and all 6 UI states' },
  { href: '/dev/auth-oauth', title: 'OAuth onboarding', blurb: 'Google and Apple registration in all 6 UI states' },
  { href: '/dev/buddy-wish', title: 'Buddy wish', blurb: 'Expandable entry and image-first wish in all 6 states' },
  { href: '/dev/screen-preview', title: 'Screen preview', blurb: '<Screen> primitive in all 6 states' },
  { href: '/dev/ui-system', title: 'UI system', blurb: 'Agent-operable primitives and Odyssey recipes' },
  { href: '/dev/components', title: 'Components', blurb: 'Buttons, pills, cards, long-German stress' },
  { href: '/dev/button-audit', title: 'Button audit', blurb: '103-locale label overflow, web only' },
  { href: '/dev/network-resilience', title: 'Network resilience', blurb: 'Weak-network send states: comment, chat, banner' },
  { href: '/dev/pressable-probe', title: 'Pressable probe', blurb: 'GOTCHAS 坑 #7: callback vs static styles on device' },
];

export default function DevGalleryHub() {
  return (
    <Screen
      header={<PageHeader title="Dev gallery" subtitle="Render-before-done verification surface" />}
      scroll
      bottomGap={28}
      contentClassName="px-5 gap-3"
    >
      {PAGES.map((p) => (
        <Link key={p.title} href={devRoute(p.href)} asChild>
          <Pressable className="rounded-3xl bg-white p-5 active:opacity-80">
            <Text className="text-base font-extrabold text-text-main">{p.title}</Text>
            <Text className="mt-1 text-sm leading-6 text-text-secondary">{p.blurb}</Text>
          </Pressable>
        </Link>
      ))}
    </Screen>
  );
}
