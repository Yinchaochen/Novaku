import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { SectionLabel } from '../../components/SectionLabel';
import { FeedFilterRow } from '../../components/community/FeedFilterRow';
import type { CommunityFeedFilter } from '../../features/community/useCommunity';
import { colors } from '../../theme/tokens';

/**
 * The Plaza's browse axis, on the band it lives in (2026-08-29).
 *
 * The Plaza tab itself cannot be walked here: it needs a signed-in session and
 * this app's dev build points at the production API, so the feed 401s. The row
 * is the part that has states worth checking, and it is data-independent — so
 * it gets a gallery of its own rather than an unverified claim.
 *
 * The yellow is reproduced rather than imported because the chips are drawn to
 * sit on it: white when chosen, 22%-white when not, and both have to stay
 * legible against #FFD17E.
 */

const BAND = '#FFD17E';

function Band({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: BAND,
        paddingTop: 14,
        paddingBottom: 12,
        paddingHorizontal: 22,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
      }}
    >
      <Text
        style={{
          fontSize: 26,
          fontWeight: '800',
          color: '#FFFFFF',
          letterSpacing: -0.3,
          marginBottom: 0,
        }}
      >
        Plaza
      </Text>
      {children}
    </View>
  );
}

export default function PlazaFiltersGallery() {
  const [live, setLive] = useState<CommunityFeedFilter>(null);
  const noop = () => undefined;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48, gap: 8 }}>
        <SectionLabel>Live — tap a chip</SectionLabel>
        <Band>
          <FeedFilterRow value={live} onChange={setLive} />
        </Band>
        <Text style={{ paddingHorizontal: 16, fontSize: 12, color: colors.textMuted }}>
          selected: {live ?? 'all'}
        </Text>

        <SectionLabel>Default — nothing chosen</SectionLabel>
        <Band>
          <FeedFilterRow value={null} onChange={noop} />
        </Band>

        <SectionLabel>A filter deep in the row is chosen</SectionLabel>
        <Band>
          <FeedFilterRow value="warning" onChange={noop} />
        </Band>

        <SectionLabel>Guide chosen — the common case</SectionLabel>
        <Band>
          <FeedFilterRow value="guide" onChange={noop} />
        </Band>
      </ScrollView>
    </Screen>
  );
}
