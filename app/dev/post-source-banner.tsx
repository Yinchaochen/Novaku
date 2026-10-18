import { Text, View } from 'react-native';

import { InfoUpdateTag } from '../../components/community/InfoUpdateTag';
import { PostUpdateBanner } from '../../components/community/PostUpdateBanner';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import type { InfoUpdate, InfoUpdateKind, PostWithUpdates } from '../../lib/postUpdates';
import { colors } from '../../theme/tokens';

/**
 * Dev gallery for D-171: the detail banner and the card tags for every kind
 * of source change, in the app's current language (switch it to check long
 * German and Chinese). Dev-only copy stays English and out of the i18n pipeline.
 */
const PAGE = 'https://lu.ma/founders-breakfast';

function post(kind: InfoUpdateKind, updates: InfoUpdate[]): PostWithUpdates {
  return { info_update_kind: kind, info_updated_at: '2026-10-20T08:00:00Z', info_updates: updates };
}

const STATES: { label: string; post: PostWithUpdates }[] = [
  {
    label: 'Time moved',
    post: post('time', [
      {
        kind: 'time',
        at: '2026-10-20T08:00:00Z',
        before: { starts_at: '2026-10-24T17:00:00Z', timed: true },
        after: { starts_at: '2026-10-25T18:00:00Z', timed: true },
        page_url: PAGE,
      },
    ]),
  },
  {
    label: 'Date moved (no clock time)',
    post: post('time', [
      {
        kind: 'time',
        at: null,
        before: { starts_at: '2026-11-04T23:00:00Z', timed: false },
        after: { starts_at: '2026-11-11T23:00:00Z', timed: false },
        page_url: null,
      },
    ]),
  },
  {
    label: 'Deadline moved',
    post: post('deadline', [
      {
        kind: 'deadline',
        at: null,
        before: { deadline: '2026-11-10T17:00:00Z' },
        after: { deadline: '2026-11-24T23:59:59Z' },
        page_url: 'https://www.b-p-w.de/wettbewerb/',
      },
    ]),
  },
  {
    label: 'New venue, then a new time',
    post: post('time', [
      {
        kind: 'time',
        at: null,
        before: { starts_at: '2026-10-24T17:00:00Z', timed: true },
        after: { starts_at: '2026-10-24T18:30:00Z', timed: true },
        page_url: PAGE,
      },
      {
        kind: 'place',
        at: null,
        before: { venue: 'Factory Berlin Mitte', address: 'Rheinsberger Str. 76/77, 10115 Berlin' },
        after: {
          venue: 'Betahaus Kreuzberg Gründungszentrum für Sozialunternehmerinnen',
          address: 'Rudi-Dutschke-Straße 23, 10969 Berlin',
        },
        page_url: PAGE,
      },
    ]),
  },
  {
    label: 'Cancelled',
    post: post('cancelled', [
      { kind: 'cancelled', at: null, before: {}, after: {}, page_url: PAGE },
    ]),
  },
  {
    label: 'No longer listed by the organiser',
    post: post('gone', [{ kind: 'gone', at: null, before: {}, after: {}, page_url: PAGE }]),
  },
  { label: 'Nothing changed (renders nothing)', post: {} },
];

const TAGS: InfoUpdateKind[] = ['time', 'place', 'deadline', 'cancelled', 'gone'];

export default function DevPostSourceBannerGallery() {
  return (
    <Screen
      header={<PageHeader title="Post source changes" subtitle="Detail banner and card tags (D-171)" />}
      scroll
      bottomGap={28}
      contentClassName="gap-4"
    >
      <View className="px-5">
        <Text className="text-[13px] font-bold" style={{ color: colors.textMuted }}>
          Card tags
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {TAGS.map((kind) => (
            <InfoUpdateTag key={kind} kind={kind} />
          ))}
        </View>
      </View>
      {STATES.map((state) => (
        <View key={state.label} testID={`dev.post-source.${state.label}`}>
          <Text className="px-5 text-[13px] font-bold" style={{ color: colors.textMuted }}>
            {state.label}
          </Text>
          <PostUpdateBanner post={state.post} />
        </View>
      ))}
    </Screen>
  );
}
