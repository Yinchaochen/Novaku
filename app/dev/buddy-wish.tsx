import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { BuddyCreateMenu } from '../../components/buddy/BuddyCreateMenu';
import { BuddyPhotoPicker } from '../../components/buddy/BuddyPhotoPicker';
import { BuddyPostCard } from '../../components/buddy/BuddyPostCard';
import { BuddyPriceField } from '../../components/buddy/BuddyPriceField';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { SurfaceCard } from '../../components/SurfaceCard';
import type { BuddyPost } from '../../features/buddyPosts/useBuddyPosts';
import { isBuddyPricingComplete, parseBuddyPriceCents, type BuddyPricingMode } from '../../features/buddyPosts/pricing';
import { colors, spacing, typography } from '../../theme/tokens';

const LONG_DE = 'Zeige möglichst genau, welchen schwer erhältlichen Gegenstand du dir wünschst und in welchen Ländern oder Städten er gefunden werden darf.';
const PREVIEW_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="%23FFE0A8"/><circle cx="600" cy="420" r="250" fill="%23F67673"/><path d="M470 420h260v190H470z" fill="%23FFF8F1"/><path d="M520 420c0-90 160-90 160 0" fill="none" stroke="%23241A16" stroke-width="28"/><text x="600" y="750" text-anchor="middle" font-size="76" font-family="sans-serif" fill="%23241A16">WISH</text></svg>';

const BASE_POST: BuddyPost = {
  id: 'buddy-wish-preview',
  author: {
    id: 'author-preview',
    display_id: 'NOVAKU01',
    display_name: 'Mina',
    avatar_url: null,
    gender: 'female',
    age: 26,
    city: 'Berlin',
    author_trust_score: 0.92,
  },
  type: 'errand_carry',
  category: 'errand_carry',
  title: 'Looking for this small Tokyo stationery set',
  body: 'The cream version shown in the photo is ideal. A close match is also welcome.',
  price_cents: 3200,
  pricing_mode: 'negotiable',
  currency: 'EUR',
  available_at: null,
  available_until: null,
  depart_date: '2026-08-01',
  return_date: '2026-08-16',
  from_city: 'Tokyo',
  to_city: 'Berlin',
  accepted_country: 'Japan',
  accepted_city: 'Tokyo',
  accepts_shipping: true,
  media_items: [{ id: 'media-preview', media_url: PREVIEW_IMAGE, mime_type: 'image/svg+xml', sort_order: 0 }],
  expired_at: '2026-09-01T00:00:00Z',
  created_at: '2026-07-13T00:00:00Z',
  is_owner: false,
  is_active: true,
};

function GallerySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={{ ...typography.overline, color: colors.textMuted }}>{title}</Text>
      {children}
    </View>
  );
}

export default function BuddyWishGallery() {
  const [priceText, setPriceText] = useState('32,50');
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const [priceMode, setPriceMode] = useState<BuddyPricingMode>('fixed');
  const priceCents = useMemo(() => parseBuddyPriceCents(priceText, priceMode), [priceMode, priceText]);

  return (
    <Screen
      header={<PageHeader title="Buddy wish" subtitle="Expandable entry, image-first wish, and six-state verification" />}
      scroll
      bottomGap={28}
      contentClassName="px-5 gap-6"
      testID="screen.dev.buddy-wish"
    >
      <GallerySection title="Normal / expandable entry">
        <SurfaceCard tone="cream" style={{ minHeight: 250 }}>
          <BuddyCreateMenu
            initiallyOpen
            companionLabel="Find a buddy"
            wishLabel="Make a wish"
            openLabel="Create"
            closeLabel="Close"
            onCompanionPress={() => undefined}
            onWishPress={() => undefined}
            bottom={spacing.lg}
            right={spacing.lg}
          />
        </SurfaceCard>
      </GallerySection>

      <GallerySection title="Normal / photo selected">
        <BuddyPhotoPicker
          items={[{ media_url: PREVIEW_IMAGE, mime_type: 'image/svg+xml', sort_order: 0 }]}
          maxItems={5}
          addLabel="Add photo"
          emptyTitle="Show what you wish for"
          emptyHint="The first photo becomes the cover."
          removeLabel="Remove photo"
          onAdd={() => undefined}
          onRemove={() => undefined}
        />
      </GallerySection>

      <GallerySection title="Pricing / entered German decimal">
        <BuddyPriceField
          priceText={priceText}
          currency={currency}
          mode={priceMode}
          isComplete={isBuddyPricingComplete(priceMode, priceCents)}
          amountPlaceholder="e.g. 25"
          fixedLabel="Price"
          freeLabel="Free"
          negotiableLabel="Negotiable"
          onPriceTextChange={setPriceText}
          onCurrencyChange={setCurrency}
          onModeChange={setPriceMode}
        />
      </GallerySection>

      <GallerySection title="Pricing / long German">
        <BuddyPriceField
          priceText="32,50"
          currency="EUR"
          mode="negotiable"
          isComplete
          amountPlaceholder="z. B. 25,50"
          fixedLabel="Festpreis"
          freeLabel="Kostenlos"
          negotiableLabel="Preis verhandelbar"
          onPriceTextChange={() => undefined}
          onCurrencyChange={() => undefined}
          onModeChange={() => undefined}
        />
      </GallerySection>

      <GallerySection title="Long German">
        <BuddyPhotoPicker
          items={[]}
          maxItems={5}
          addLabel="Weitere aussagekräftige Produktfotografie hinzufügen"
          emptyTitle="Zeige genau, was du dir wünschst"
          emptyHint={LONG_DE}
          removeLabel="Foto entfernen"
          onAdd={() => undefined}
          onRemove={() => undefined}
        />
      </GallerySection>

      <GallerySection title="Empty">
        <BuddyPhotoPicker
          items={[]}
          maxItems={5}
          addLabel="Add photo"
          emptyTitle="No photos yet"
          emptyHint="Photos are optional, but they make a wish easier to understand."
          removeLabel="Remove photo"
          onAdd={() => undefined}
          onRemove={() => undefined}
        />
      </GallerySection>

      <GallerySection title="Loading upload">
        <BuddyPhotoPicker
          items={[]}
          maxItems={5}
          addLabel="Uploading photo"
          emptyTitle="Preparing your photo"
          emptyHint="Keep this screen open while the upload finishes."
          removeLabel="Remove photo"
          isUploading
          onAdd={() => undefined}
          onRemove={() => undefined}
        />
      </GallerySection>

      <GallerySection title="Other person's post">
        <BuddyPostCard post={BASE_POST} onPress={() => undefined} />
      </GallerySection>

      <GallerySection title="Own post">
        <BuddyPostCard post={{ ...BASE_POST, id: 'buddy-wish-owner-preview', is_owner: true }} onPress={() => undefined} />
      </GallerySection>
    </Screen>
  );
}
