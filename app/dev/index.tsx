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
  { href: '/dev/social-guide', title: 'Social walkthrough', blurb: 'Chapter steps, confirm card, long German, no-target state' },
  { href: '/dev/app-update', title: 'App update', blurb: "What's new, update available, forced update, long German" },
  { href: '/dev/plaza-search', title: 'Plaza search', blurb: 'Search entry, history, filters, results, zero/error states' },
  { href: '/dev/product-guide', title: 'First-value guide', blurb: 'Spotlight walkthrough, publish confirm, and re-entry in all 6 states' },
  { href: '/dev/floating-input', title: 'Keyboard-safe input', blurb: 'Floating input sheet proxy in all 6 states with a live demo' },
  { href: '/dev/video-post', title: 'Video post', blurb: 'XHS-style player, card badges, status chips, live sample' },
  { href: '/dev/city-location', title: 'City and location', blurb: 'Real city selection, privacy, and all 6 UI states' },
  { href: '/dev/auth-oauth', title: 'OAuth onboarding', blurb: 'Google and Apple registration in all 6 UI states' },
  { href: '/dev/buddy-wish', title: 'Buddy wish', blurb: 'Expandable entry and image-first wish in all 6 states' },
  { href: '/dev/buddy-guide', title: 'Buddy walkthrough', blurb: 'Buddy tour steps and the simplified wish fields in all 6 states' },
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
