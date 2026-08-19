import { ScrollView, Text, View } from 'react-native';

import { OfficialChip, isOfficialAuthor } from '../../components/OfficialChip';
import { Screen } from '../../components/Screen';
import { SectionLabel } from '../../components/SectionLabel';
import { VerifiedBadge } from '../../components/VerifiedBadge';
import { useLanguage } from '../../context/LanguageContext';
import { CommunityPostCard } from '../../features/community/CommunityPostCard';
import type { CommunityPost } from '../../features/community/useCommunity';
import { colors } from '../../theme/tokens';

// Dev gallery for the official-account chip (D-065), walked per D-035 / MS-19.
// Section headers are English-only (dev exception); every user-facing string
// renders through the real i18n keys so a missing translation shows up here.
//
// The state that actually matters is 5: chip and verified badge side by side.
// They make unrelated claims ("published by Postervia" vs "a checked real
// person") and the whole point of using a word rather than a second glyph is
// that the pair stays readable — which only a render can settle.

function mockPost(
  id: string,
  title: string,
  body: string,
  author: Partial<CommunityPost['author']> = {},
): CommunityPost {
  return {
    id,
    post_type: 'guide',
    title,
    body,
    city: 'berlin',
    identity_scope: 'all',
    odyssey_slug: 'berlin_anmeldung',
    language: 'en',
    source_language: 'en',
    title_source_language: 'en',
    body_source_language: 'en',
    extracted_summary_source_language: null,
    source_url: 'https://service.berlin.de/dienstleistung/120686/',
    extracted_summary: null,
    ai_summary_enabled: true,
    ai_enrichment_status: 'skipped_short',
    translated_title: null,
    translated_body: null,
    translated_extracted_summary: null,
    is_translated: false,
    moderation_status: 'approved',
    flagged_for_review: false,
    flag_reason: null,
    visibility: 'public',
    helpful_count: 0,
    save_count: 0,
    comment_count: 0,
    add_to_odyssey_count: 0,
    created_at: '2026-08-19T10:00:00Z',
    author: {
      id: '00000000-0000-4000-8000-00000000dev1',
      display_name: 'Postervia',
      avatar_url: null,
      city: 'berlin',
      identity: 'local',
      account_kind: 'official',
      viewer_is_following: false,
      ...author,
    },
    media_items: [],
    action_candidates: [],
    viewer_marked_helpful: false,
    viewer_saved: false,
    viewer_commented_excerpt: null,
    feed_context: null,
    content_context: null,
    share_token: null,
  } as unknown as CommunityPost;
}

function AuthorRow({
  name,
  official,
  verified,
}: {
  name: string;
  official: boolean;
  verified: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
      <Text
        numberOfLines={1}
        style={{ flexShrink: 1, fontSize: 15, fontWeight: '600', color: colors.textMain }}
      >
        {name}
      </Text>
      {verified ? <VerifiedBadge size={14} /> : null}
      {official ? <OfficialChip /> : null}
    </View>
  );
}

export default function OfficialChipGallery() {
  const { t } = useLanguage();

  return (
    <Screen background="default" topInset>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 18 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMain }}>
          Official account chip — state gallery
        </Text>

        <SectionLabel>1 · Normal — official author</SectionLabel>
        <AuthorRow name="Postervia" official verified={false} />

        <SectionLabel>2 · Human author (chip must be absent)</SectionLabel>
        <AuthorRow name="Mariia" official={false} verified={false} />

        <SectionLabel>3 · Long German name + chip (wrapping)</SectionLabel>
        <AuthorRow
          name="Wohnungsanmeldungsbestätigungsstelle Friedrichshain-Kreuzberg"
          official
          verified={false}
        />

        <SectionLabel>4 · Missing account_kind — must render as human</SectionLabel>
        <AuthorRow
          name="Legacy cached payload"
          official={isOfficialAuthor({ display_name: 'x' } as never)}
          verified={false}
        />

        <SectionLabel>5 · Chip beside the verified badge (two claims, one row)</SectionLabel>
        <AuthorRow name="Postervia" official verified />

        <SectionLabel>6 · Real feed card + AI disclosure copy</SectionLabel>
        <CommunityPostCard
          post={mockPost(
            '00000000-0000-4000-8000-0000000000c1',
            'Registering your address in Berlin',
            'Book an Anmeldung appointment through the Bürgeramt service portal. Bring your passport and the Wohnungsgeberbestätigung from your landlord.',
          )}
          onPress={() => {}}
        />
        <View
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: 'rgba(98, 57, 40, 0.05)',
          }}
        >
          <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textMuted }}>
            {t.plaza.official_ai_disclosure}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
