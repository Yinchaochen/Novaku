import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { SectionLabel } from '../../components/SectionLabel';
import { StateBlock } from '../../components/StateBlock';
import { useLanguage } from '../../context/LanguageContext';
import { CommunityPostCard } from '../../features/community/CommunityPostCard';
import type { CommunityPost } from '../../features/community/useCommunity';
import { colors } from '../../theme/tokens';

// Dev gallery for PLAZA-SEARCH-001 (D-035 / MS-19 six-state walk).
// Section headers stay English-only (dev exception); user-facing copy renders
// through the real i18n keys so the walk catches missing translations.

function mockPost(id: string, title: string, body: string): CommunityPost {
  return {
    id,
    post_type: 'experience',
    title,
    body,
    city: 'berlin',
    identity_scope: 'all',
    odyssey_slug: null,
    language: 'de',
    source_language: 'de',
    title_source_language: 'de',
    body_source_language: 'de',
    extracted_summary_source_language: null,
    source_url: null,
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
    helpful_count: 3,
    save_count: 1,
    comment_count: 2,
    add_to_odyssey_count: 1,
    created_at: '2026-08-01T10:00:00Z',
    author: {
      id: '00000000-0000-4000-8000-00000000dev1',
      display_name: 'Dev Author',
      avatar_url: null,
      city: 'berlin',
      identity: 'resident',
      viewer_is_following: false,
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

const HISTORY_MOCK = ['Anmeldung Termin', '儿科医生', 'SIM Karte', 'Wohnung'];
const DISCOVER_MOCK = [
  'anmeldung termin',
  'bürgeramt wartezeit',
  '柏林 银行开户',
  'sim karte prepaid',
  'anerkennung zeugnis',
  'wohnungsanmeldung bestätigung des wohnungsgebers',
];

function Chip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <View
      style={{
        paddingVertical: 7,
        paddingHorizontal: 13,
        borderRadius: 999,
        backgroundColor: active ? colors.brandCoral : 'rgba(98, 57, 40, 0.06)',
        borderWidth: 1,
        borderColor: active ? colors.brandCoral : 'rgba(98, 57, 40, 0.10)',
      }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#FFFFFF' : colors.textMuted }}>
        {label}
      </Text>
    </View>
  );
}

export default function PlazaSearchGallery() {
  const { t } = useLanguage();

  return (
    <Screen background="default" topInset>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 18 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textMain }}>
          Plaza search — state gallery
        </Text>

        <SectionLabel>1 · Initial (with history)</SectionLabel>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>
              {t.plaza.search_history}
            </Text>
            <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HISTORY_MOCK.map((item) => (
              <View
                key={item}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 13,
                  borderRadius: 999,
                  backgroundColor: '#FFF3E5',
                  borderWidth: 1,
                  borderColor: 'rgba(98, 57, 40, 0.08)',
                }}
              >
                <Text style={{ fontSize: 13, color: colors.textBrown, fontWeight: '600' }}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <SectionLabel>1b · Discover board (trending terms; hidden when empty)</SectionLabel>
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, paddingBottom: 4 }}>
            {t.plaza.search_discover}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {DISCOVER_MOCK.map((item) => (
              <View key={item} style={{ width: '50%', paddingVertical: 11, paddingRight: 10 }}>
                <Text numberOfLines={1} style={{ fontSize: 14.5, color: colors.textMain }}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <SectionLabel>2 · Initial (no history)</SectionLabel>
        <Text style={{ fontSize: 13.5, lineHeight: 20, color: colors.textMuted, textAlign: 'center' }}>
          {t.plaza.search_initial_hint}
        </Text>

        <SectionLabel>3 · Filters row (results only — hidden on the initial page)</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label={t.plaza.search_sort_relevance} active />
          <Chip label={t.plaza.search_sort_recent} />
          <Chip label={t.plaza.search_city_mine} active />
          <Chip label={t.plaza.search_time_half_year} active />
          <Chip label={t.plaza.type_experience} />
          <Chip label={t.plaza.type_question} />
          <Chip label={t.plaza.type_guide} />
          <Chip label={t.plaza.type_warning} />
          <Chip label={t.plaza.type_recommendation} />
        </View>

        <SectionLabel>4 · Loading</SectionLabel>
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
          <ActivityIndicator color={colors.brandCoral} />
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{t.plaza.search_loading}</Text>
        </View>

        <SectionLabel>5 · Results (official hit + highlight + meta)</SectionLabel>
        <GlassCard tone="cream" radiusKey="lg" padding={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#EFE9FF',
              }}
            >
              <Ionicons name="shield-checkmark" size={17} color="#6B5CD9" />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '800', color: colors.textMain }}>
                Register your address (Anmeldung)
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                {t.plaza.search_official_hint}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </GlassCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
            {t.plaza.search_results_count.replace('{count}', '12')}
          </Text>
          <Text style={{ fontSize: 11, color: '#6B5CD9', fontWeight: '700' }}>
            {t.plaza.search_translated_note}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <CommunityPostCard
              post={mockPost('dev-a', 'Anmeldung Termin in Pankow ergattern', 'So habe ich nach zwei Wochen einen Termin bekommen.')}
              titleHighlight="Anmeldung Termin"
            />
          </View>
          <View style={{ flex: 1 }}>
            <CommunityPostCard
              post={mockPost('dev-b', 'Sehr langer deutscher Titel über die Wohnungsanmeldung und Behördengänge', 'Langer Inhalt zum Umbruchverhalten der Karte im deutschen UI.')}
              titleHighlight="Wohnungsanmeldung"
            />
          </View>
        </View>

        <SectionLabel>6 · Zero result (ask CTA)</SectionLabel>
        <StateBlock
          tone="neutral"
          icon="search-outline"
          title={t.plaza.search_empty_title}
          message={t.plaza.search_empty_body}
          actionLabel={t.plaza.search_empty_cta}
          onAction={() => undefined}
        />

        <SectionLabel>7 · Error</SectionLabel>
        <StateBlock
          tone="danger"
          icon="cloud-offline-outline"
          title={t.plaza.search_error_title}
          message={t.plaza.search_error_body}
          actionLabel={t.plaza.search_retry}
          onAction={() => undefined}
        />

        <SectionLabel>8 · Rate limited</SectionLabel>
        <StateBlock
          tone="danger"
          icon="hourglass-outline"
          title={t.plaza.search_rate_limited}
          actionLabel={t.plaza.search_retry}
          onAction={() => undefined}
        />

        <SectionLabel>9 · Min-chars hint</SectionLabel>
        <Text style={{ fontSize: 12.5, color: colors.brandCoral, fontWeight: '600' }}>
          {t.plaza.search_min_chars}
        </Text>
      </ScrollView>
    </Screen>
  );
}
