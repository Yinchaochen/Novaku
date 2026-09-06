import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, Text, TextInput, View } from 'react-native';

import { FeedbackPressable } from '../../components/FeedbackPressable';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StateBlock } from '../../components/StateBlock';
import { useLanguage } from '../../context/LanguageContext';
import { CommunityPostCard } from '../../features/community/CommunityPostCard';
import { CommunityPostDetailModal } from '../../features/community/CommunityPostDetailModal';
import {
  CommunityPost,
  CommunitySearchParams,
  useSearchCommunityPosts,
  useSearchDiscover,
} from '../../features/community/useCommunity';
import { useAuthStore } from '../../store/authStore';
import { usePlazaComposeIntentStore } from '../../store/plazaComposeIntentStore';
import {
  normalizeHistoryQuery,
  usePlazaSearchHistoryStore,
} from '../../store/plazaSearchHistoryStore';
import { colors } from '../../theme/tokens';

type PostType = CommunityPost['post_type'];
type TimeRange = CommunitySearchParams['timeRange'];

const POST_TYPES: PostType[] = ['experience', 'question', 'guide', 'warning', 'recommendation'];
const TIME_ORDER: TimeRange[] = ['all', 'week', 'month', 'half_year'];
// Recent searches collapse past this many, like the chevron in XHS's history row.
const HISTORY_COLLAPSED_COUNT = 8;

function dedupePostsById(posts: CommunityPost[]): CommunityPost[] {
  const seen = new Set<string>();
  const out: CommunityPost[] = [];
  for (const post of posts) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      out.push(post);
    }
  }
  return out;
}

function extractErrorCode(error: unknown): string | null {
  const anyError = error as
    | { response?: { status?: number; data?: { error?: { code?: string } } } }
    | null
    | undefined;
  return anyError?.response?.data?.error?.code ?? null;
}

function isRateLimitError(error: unknown): boolean {
  const anyError = error as { response?: { status?: number } } | null | undefined;
  return (
    extractErrorCode(error) === 'community.search_rate_limited' ||
    anyError?.response?.status === 429
  );
}

function FilterChip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <FeedbackPressable
      onPress={onPress}
      testID={testID}
      hitSlop={8}
      style={{
        paddingVertical: 7,
        paddingHorizontal: 13,
        borderRadius: 999,
        backgroundColor: active ? colors.brandCoral : 'rgba(98, 57, 40, 0.06)',
        borderWidth: 1,
        borderColor: active ? colors.brandCoral : 'rgba(98, 57, 40, 0.10)',
      }}
      pressedStyle={{ opacity: 0.85 }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: active ? '#FFFFFF' : colors.textMuted }}>
        {label}
      </Text>
    </FeedbackPressable>
  );
}

export default function PlazaSearchScreen() {
  const { t } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const hasCity = Boolean(user?.city);

  const historyItems = usePlazaSearchHistoryStore((state) => state.items);
  useEffect(() => {
    void usePlazaSearchHistoryStore.getState().hydrate();
  }, []);

  const [rawQuery, setRawQuery] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [params, setParams] = useState<CommunitySearchParams | null>(null);
  const [postType, setPostType] = useState<PostType | null>(null);
  const [cityScope, setCityScope] = useState<'mine' | 'all'>(hasCity ? 'mine' : 'all');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sort, setSort] = useState<'relevance' | 'recent'>('relevance');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const searchQuery = useSearchCommunityPosts(params);
  const discoverQuery = useSearchDiscover();
  const discoverItems = discoverQuery.data ?? [];
  const visibleHistory = historyExpanded
    ? historyItems
    : historyItems.slice(0, HISTORY_COLLAPSED_COUNT);
  const pages = searchQuery.data?.pages;
  const posts = useMemo(() => dedupePostsById(pages?.flatMap((page) => page.items) ?? []), [pages]);
  const firstPage = pages?.[0];

  const submit = (value?: string) => {
    const normalized = normalizeHistoryQuery(value ?? rawQuery);
    if (normalized.length < 2) {
      setHint(t.plaza.search_min_chars);
      return;
    }
    setHint(null);
    if (value !== undefined) {
      setRawQuery(value);
    }
    usePlazaSearchHistoryStore.getState().add(normalized);
    setParams({ q: normalized, postType, cityScope: hasCity ? cityScope : 'all', timeRange, sort });
    Keyboard.dismiss();
  };

  const patchParams = (patch: Partial<Omit<CommunitySearchParams, 'q'>>) => {
    if (params) {
      setParams({ ...params, ...patch });
    }
  };

  const goAsk = () => {
    const title = (params?.q ?? normalizeHistoryQuery(rawQuery)).slice(0, 160);
    usePlazaComposeIntentStore.getState().setIntent({ kind: 'ask', title, postType: 'question' });
    router.navigate('/(tabs)/plaza');
  };

  const timeLabels: Record<TimeRange, string> = {
    all: t.plaza.search_time_all,
    week: t.plaza.search_time_week,
    month: t.plaza.search_time_month,
    half_year: t.plaza.search_time_half_year,
  };
  const typeLabels: Record<PostType, string> = {
    experience: t.plaza.type_experience,
    question: t.plaza.type_question,
    guide: t.plaza.type_guide,
    warning: t.plaza.type_warning,
    recommendation: t.plaza.type_recommendation,
  };

  const showInitial = params === null;
  const isRateLimited = searchQuery.isError && isRateLimitError(searchQuery.error);
  const showZeroResult =
    params !== null && !searchQuery.isLoading && !searchQuery.isError && posts.length === 0;

  const officialHit = firstPage?.official_hit ?? null;

  return (
    <Screen background="default" topInset keyboard contentStyle={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          paddingTop: 6,
          paddingBottom: 10,
        }}
      >
        <FeedbackPressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityLabel={t.plaza.search_back_a11y}
          testID="plaza-search.back"
          style={{ padding: 4 }}
          pressedStyle={{ opacity: 0.6 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textMain} />
        </FeedbackPressable>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#FFFFFF',
            borderRadius: 999,
            paddingHorizontal: 12,
            height: 40,
            borderWidth: 1,
            borderColor: 'rgba(98, 57, 40, 0.08)',
          }}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: 14, color: colors.textMain, paddingVertical: 0 }}
            placeholder={t.plaza.search_placeholder}
            placeholderTextColor={colors.textMuted}
            value={rawQuery}
            onChangeText={(value) => {
              setRawQuery(value);
              if (hint) {
                setHint(null);
              }
            }}
            returnKeyType="search"
            onSubmitEditing={() => submit()}
            autoFocus
            testID="plaza-search.input"
          />
          {rawQuery ? (
            <FeedbackPressable onPress={() => setRawQuery('')} hitSlop={14} pressedStyle={{ opacity: 0.6 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </FeedbackPressable>
          ) : null}
        </View>
        <FeedbackPressable
          onPress={() => submit()}
          testID="plaza-search.submit"
          hitSlop={8}
          style={{ paddingHorizontal: 6, paddingVertical: 8 }}
          pressedStyle={{ opacity: 0.7 }}
        >
          <Text style={{ color: colors.brandCoral, fontWeight: '800', fontSize: 14.5 }}>
            {t.plaza.search_button}
          </Text>
        </FeedbackPressable>
      </View>

      {hint ? (
        <Text
          testID="plaza-search.hint"
          style={{ paddingHorizontal: 18, paddingBottom: 8, fontSize: 12.5, color: colors.brandCoral, fontWeight: '600' }}
        >
          {hint}
        </Text>
      ) : null}

      {/* Filters belong to results: before the first search the page is just
          the box, what you searched before, and what others are searching. */}
      {showInitial ? null : (
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          paddingHorizontal: 14,
          paddingBottom: 10,
        }}
      >
        <FilterChip
          label={t.plaza.search_sort_relevance}
          active={sort === 'relevance'}
          onPress={() => {
            setSort('relevance');
            patchParams({ sort: 'relevance' });
          }}
          testID="plaza-search.sort-relevance"
        />
        <FilterChip
          label={t.plaza.search_sort_recent}
          active={sort === 'recent'}
          onPress={() => {
            setSort('recent');
            patchParams({ sort: 'recent' });
          }}
          testID="plaza-search.sort-recent"
        />
        {hasCity ? (
          <FilterChip
            label={cityScope === 'mine' ? t.plaza.search_city_mine : t.plaza.search_city_all}
            active={cityScope === 'mine'}
            onPress={() => {
              const next = cityScope === 'mine' ? 'all' : 'mine';
              setCityScope(next);
              patchParams({ cityScope: next });
            }}
            testID="plaza-search.city"
          />
        ) : null}
        <FilterChip
          label={timeLabels[timeRange]}
          active={timeRange !== 'all'}
          onPress={() => {
            const next = TIME_ORDER[(TIME_ORDER.indexOf(timeRange) + 1) % TIME_ORDER.length];
            setTimeRange(next);
            patchParams({ timeRange: next });
          }}
          testID="plaza-search.time"
        />
        {POST_TYPES.map((type) => (
          <FilterChip
            key={type}
            label={typeLabels[type]}
            active={postType === type}
            onPress={() => {
              const next = postType === type ? null : type;
              setPostType(next);
              patchParams({ postType: next });
            }}
            testID={`plaza-search.type-${type}`}
          />
        ))}
      </View>
      )}

      {showInitial ? (
        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
        >
          {historyItems.length > 0 ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 10,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>
                  {t.plaza.search_history}
                </Text>
                <FeedbackPressable
                  onPress={() => usePlazaSearchHistoryStore.getState().clear()}
                  hitSlop={10}
                  testID="plaza-search.clear-history"
                  accessibilityLabel={t.plaza.search_clear_history}
                  pressedStyle={{ opacity: 0.6 }}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
                </FeedbackPressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {visibleHistory.map((item) => (
                  <FeedbackPressable
                    key={item}
                    onPress={() => submit(item)}
                    hitSlop={8}
                    style={{
                      maxWidth: 220,
                      paddingVertical: 7,
                      paddingHorizontal: 13,
                      borderRadius: 999,
                      backgroundColor: '#FFF3E5',
                      borderWidth: 1,
                      borderColor: 'rgba(98, 57, 40, 0.08)',
                    }}
                    pressedStyle={{ opacity: 0.8 }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 13, color: colors.textBrown, fontWeight: '600' }}
                    >
                      {item}
                    </Text>
                  </FeedbackPressable>
                ))}
                {historyItems.length > HISTORY_COLLAPSED_COUNT ? (
                  <FeedbackPressable
                    onPress={() => setHistoryExpanded((value) => !value)}
                    hitSlop={8}
                    testID="plaza-search.toggle-history"
                    accessibilityLabel={
                      historyExpanded ? t.plaza.search_history_less : t.plaza.search_history_more
                    }
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(98, 57, 40, 0.12)',
                    }}
                    pressedStyle={{ opacity: 0.7 }}
                  >
                    <Ionicons
                      name={historyExpanded ? 'chevron-up' : 'chevron-down'}
                      size={15}
                      color={colors.textMuted}
                    />
                  </FeedbackPressable>
                ) : null}
              </View>
            </>
          ) : (
            <Text
              testID="plaza-search.initial-hint"
              style={{ paddingTop: 6, fontSize: 13.5, lineHeight: 20, color: colors.textMuted }}
            >
              {t.plaza.search_initial_hint}
            </Text>
          )}

          {discoverItems.length > 0 ? (
            <View style={{ paddingTop: 26 }} testID="plaza-search.discover">
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, paddingBottom: 4 }}>
                {t.plaza.search_discover}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {discoverItems.map((item) => (
                  <FeedbackPressable
                    key={item}
                    onPress={() => submit(item)}
                    hitSlop={6}
                    style={{ width: '50%', paddingVertical: 11, paddingRight: 10 }}
                    pressedStyle={{ opacity: 0.6 }}
                  >
                    <Text numberOfLines={1} style={{ fontSize: 14.5, color: colors.textMain }}>
                      {item}
                    </Text>
                  </FeedbackPressable>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : searchQuery.isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', paddingTop: 46, gap: 10 }}>
          <ActivityIndicator color={colors.brandCoral} />
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{t.plaza.search_loading}</Text>
        </View>
      ) : searchQuery.isError ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <StateBlock
            tone="danger"
            icon={isRateLimited ? 'hourglass-outline' : 'cloud-offline-outline'}
            title={isRateLimited ? t.plaza.search_rate_limited : t.plaza.search_error_title}
            message={isRateLimited ? undefined : t.plaza.search_error_body}
            actionLabel={t.plaza.search_retry}
            onAction={() => void searchQuery.refetch()}
            testID="plaza-search.error"
          />
        </View>
      ) : showZeroResult ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <StateBlock
            tone="neutral"
            icon="search-outline"
            title={t.plaza.search_empty_title}
            message={t.plaza.search_empty_body}
            actionLabel={t.plaza.search_empty_cta}
            onAction={goAsk}
            testID="plaza-search.empty"
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlashList
            data={posts}
            masonry
            numColumns={2}
            keyExtractor={(post) => post.id}
            renderItem={({ item }) => (
              <View style={{ paddingHorizontal: 6 }}>
                <CommunityPostCard
                  post={item}
                  onPress={setSelectedPost}
                  titleHighlight={params?.q}
                />
              </View>
            )}
            contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 60 }}
            onEndReached={() => {
              if (searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
                void searchQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.6}
            ListHeaderComponent={
              <View style={{ paddingHorizontal: 6, paddingBottom: 4 }}>
                {officialHit ? (
                  <FeedbackPressable
                    onPress={() => router.navigate('/(tabs)/tasks')}
                    testID="plaza-search.official-hit"
                    pressedStyle={{ opacity: 0.85 }}
                    style={{ marginBottom: 10 }}
                  >
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
                          <Text
                            numberOfLines={1}
                            style={{ fontSize: 14, fontWeight: '800', color: colors.textMain }}
                          >
                            {officialHit.title}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }}>
                            {t.plaza.search_official_hint}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </View>
                    </GlassCard>
                  </FeedbackPressable>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>
                    {t.plaza.search_results_count.replace(
                      '{count}',
                      String(firstPage?.total ?? posts.length),
                    )}
                  </Text>
                  {firstPage?.used_translation ? (
                    <Text style={{ fontSize: 11, color: '#6B5CD9', fontWeight: '700' }}>
                      {t.plaza.search_translated_note}
                    </Text>
                  ) : null}
                </View>
              </View>
            }
            ListFooterComponent={
              searchQuery.isFetchingNextPage ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator color={colors.brandCoral} />
                </View>
              ) : posts.length > 0 && !searchQuery.hasNextPage ? (
                <Text
                  style={{
                    textAlign: 'center',
                    paddingVertical: 16,
                    fontSize: 12,
                    color: colors.textMuted,
                  }}
                >
                  {t.plaza.search_end_of_results}
                </Text>
              ) : null
            }
          />
        </View>
      )}

      <CommunityPostDetailModal
        post={selectedPost}
        visible={selectedPost !== null}
        onClose={() => setSelectedPost(null)}
      />
    </Screen>
  );
}
