import { Link, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';

/**
 * Dev gallery hub — the verification surface (GOTCHAS §9). Reachable on web
 * because the root auth redirect exempts `/dev` (app/_layout.tsx). The Expo Web
 * static export of this app is deployed (Cloudflare Pages) so every branch has a
 * URL to eyeball rendered states. Dev-only: English, out of the i18n pipeline.
 */

// expo-router's typedRoutes table (.expo/types/router.d.ts) only regenerates on
// `expo start`; sibling dev routes added in the same change aren't in it yet,
// though they resolve fine at runtime. Widen here so a stale codegen file can't
// block tsc — dev-only hub, not a user-facing route.
const devRoute = (p: string) => p as unknown as Href;

const PAGES: { href: string; title: string; blurb: string }[] = [
  { href: '/dev/screen-preview', title: 'Screen preview', blurb: '<Screen> primitive in all 6 states' },
  { href: '/dev/components', title: 'Components', blurb: 'Buttons · pills · cards — long-German stress' },
  { href: '/dev/button-audit', title: 'Button audit', blurb: '103-locale label overflow (web only)' },
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
