import { Pressable, ScrollView, Text } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import type { CommunityFeedFilter } from '../../features/community/useCommunity';

type FeedFilterLabelKey =
  | 'filter_all'
  | 'type_guide'
  | 'type_question'
  | 'type_recommendation'
  | 'type_experience'
  | 'type_warning';

const FEED_FILTERS: { key: CommunityFeedFilter; labelKey: FeedFilterLabelKey }[] = [
  { key: null, labelKey: 'filter_all' },
  { key: 'guide', labelKey: 'type_guide' },
  { key: 'question', labelKey: 'type_question' },
  { key: 'recommendation', labelKey: 'type_recommendation' },
  { key: 'experience', labelKey: 'type_experience' },
  { key: 'warning', labelKey: 'type_warning' },
];

/**
 * The one way to browse the Plaza along an axis other than "everything".
 *
 * Lives inside the yellow band rather than above the list: a filter that
 * scrolls away is a filter a reader cannot undo without scrolling back, and
 * the band was already spending ~100dp of permanent screen on a word and three
 * icons. The chips are what that space buys now.
 *
 * The chosen filter is sent to the backend and is part of the feed's query key
 * — filtering the pages already in memory would show a nearly empty screen and
 * present it as the whole category.
 */
export function FeedFilterRow({
  value,
  onChange,
}: {
  value: CommunityFeedFilter;
  onChange: (next: CommunityFeedFilter) => void;
}) {
  const { t } = useLanguage();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID="plaza.feed-filters"
      // Negative margins undo the band's 22dp inset so the row can scroll edge
      // to edge, then the content inset puts the first chip back under the
      // title.
      style={{ marginTop: 12, marginHorizontal: -22 }}
      contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}
    >
      {FEED_FILTERS.map((filter) => {
        const active = filter.key === value;
        return (
          <Pressable
            key={filter.key ?? 'all'}
            testID={`plaza.feed-filter.${filter.key ?? 'all'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(filter.key)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 999,
              // Both states are brown-on-light rather than white-on-yellow.
              // White text over a 22%-white pill on #FFD17E measures about
              // 1.4:1 -- it looked like the rest of the band and could not be
              // read, which for the only browse control on the screen is worse
              // than looking plain.
              backgroundColor: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.42)',
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: 12.5,
                fontWeight: '700',
                color: active ? '#7A5100' : '#8A5F12',
              }}
            >
              {t.plaza[filter.labelKey]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
