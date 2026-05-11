import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod/v4';

import { AppBackground } from '../../components/AppBackground';
import { ChalkIcon } from '../../components/ChalkIcon';
import { GlassCard } from '../../components/GlassCard';
import { LangPill } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { colors, shadows } from '../../theme/tokens';
import { resolveMediaUrl } from '../../lib/media';
import { CommunityPostCard } from '../../features/community/CommunityPostCard';
import { CommunityPostDetailModal } from '../../features/community/CommunityPostDetailModal';
import {
  CommunityPost,
  CommunityPlaceSuggestion,
  CommunitySelectedPlaceInput,
  CommunityPostMedia,
  getCommunitySessionId,
  useCommunityFeed,
  useCreateCommunityPost,
  usePlaceSuggestions,
  useRefillFeedSnapshot,
  useTrackCommunityEvents,
  useUpdateCommunityPost,
  useUploadCommunityMedia,
} from '../../features/community/useCommunity';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  post_type: z.enum(['experience', 'question', 'guide', 'warning', 'recommendation']),
  title: z.string().min(4).max(160),
  body: z.string().min(12).max(4000),
});

type FormData = z.infer<typeof schema>;

const POST_TYPES: FormData['post_type'][] = ['experience', 'question', 'guide', 'warning', 'recommendation'];
const MAX_MEDIA_ITEMS = 4;
const POST_BUTTON_WIDTH = 130;
const POST_BUTTON_HEIGHT = 55;
const POST_BUTTON_RADIUS = POST_BUTTON_HEIGHT / 2;
const POST_BUTTON_ICON_SIZE = 20;
const POST_BUTTON_FONT_SIZE = 18;
const DEFAULT_FORM_VALUES: FormData = {
  post_type: 'experience',
  title: '',
  body: '',
};

function estimatePostWeight(post: CommunityPost) {
  const mediaWeight = post.media_items.length > 0 ? 3.4 : 2.1;
  const textWeight = Math.min(post.title.length / 34, 1.7) + Math.min(post.body.length / 120, 1.1);
  return mediaWeight + textWeight;
}

function splitIntoColumns(posts: CommunityPost[]) {
  const left: CommunityPost[] = [];
  const right: CommunityPost[] = [];
  let leftWeight = 0;
  let rightWeight = 0;

  for (const post of posts) {
    const weight = estimatePostWeight(post);
    if (leftWeight <= rightWeight) {
      left.push(post);
      leftWeight += weight;
    } else {
      right.push(post);
      rightWeight += weight;
    }
  }

  return { left, right };
}

async function noopRefetch() {
  return undefined;
}

function mapSuggestionToSelectedPlace(place: CommunityPlaceSuggestion): CommunitySelectedPlaceInput {
  return {
    name: place.name,
    subtitle: place.subtitle,
    source_url: place.source_url,
    latitude: place.latitude,
    longitude: place.longitude,
    short_description: place.short_description ?? null,
    image_url: place.image_url ?? null,
    reference_url: place.reference_url ?? null,
  };
}

function deriveTaggedPlacesFromPost(post: CommunityPost): CommunitySelectedPlaceInput[] {
  const seen = new Set<string>();
  const derived: CommunitySelectedPlaceInput[] = [];

  for (const candidate of post.action_candidates) {
    const metadata = candidate.metadata_json ?? {};
    const placeName =
      (typeof metadata.place_name === 'string' && metadata.place_name.trim()) ||
      candidate.entity_name ||
      null;
    const sourceUrl =
      (typeof candidate.source_url === 'string' && candidate.source_url.trim()) ||
      (typeof post.source_url === 'string' && post.source_url.trim()) ||
      null;
    if (!placeName || !sourceUrl || seen.has(sourceUrl)) {
      continue;
    }
    seen.add(sourceUrl);
    derived.push({
      name: placeName,
      subtitle: typeof metadata.location_hint === 'string' ? metadata.location_hint : post.city ?? '',
      source_url: sourceUrl,
      latitude: typeof metadata.latitude === 'number' ? metadata.latitude : null,
      longitude: typeof metadata.longitude === 'number' ? metadata.longitude : null,
      short_description: typeof candidate.description === 'string' ? candidate.description : null,
      image_url: typeof metadata.image_url === 'string' ? metadata.image_url : null,
      reference_url: typeof metadata.reference_url === 'string' ? metadata.reference_url : null,
    });
  }

  return derived;
}

export default function PlazaScreen() {
  const { t } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  const feedQuery = useCommunityFeed();
  const refillFeed = useRefillFeedSnapshot();
  const pages = feedQuery?.data?.pages;
  const data = pages?.flatMap((page) => page.items) ?? [];
  const isLoading = feedQuery?.isLoading ?? false;
  const isError = feedQuery?.isError ?? false;
  const isFetching = feedQuery?.isFetching ?? false;
  const isFetchingNextPage = feedQuery?.isFetchingNextPage ?? false;
  const hasNextPage = feedQuery?.hasNextPage ?? false;
  const refetch = feedQuery?.refetch ?? noopRefetch;
  const fetchNextPage = feedQuery?.fetchNextPage ?? (() => Promise.resolve(undefined));
  const lastPage = pages && pages.length > 0 ? pages[pages.length - 1] : undefined;
  const isFeedExhausted = lastPage?.exhausted === true;
  const isRefilling = refillFeed?.isPending ?? false;
  const createPost = useCreateCommunityPost();
  const updatePost = useUpdateCommunityPost(editingPost?.id ?? null);
  const trackCommunityEvents = useTrackCommunityEvents()?.mutate ?? (() => undefined);
  const uploadMedia = useUploadCommunityMedia();
  const [mediaItems, setMediaItems] = useState<CommunityPostMedia[]>([]);
  const [composerMessage, setComposerMessage] = useState<string | null>(null);
  const [plazaBanner, setPlazaBanner] = useState<{ tone: 'success' | 'info'; message: string } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [selectedPlaces, setSelectedPlaces] = useState<CommunitySelectedPlaceInput[]>([]);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const impressionKeysRef = useRef<Set<string>>(new Set());

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const selectedType = watch('post_type');
  const composerHint =
    user?.identity === 'local'
      ? (t.plaza.composer_hint_local ?? t.plaza.composer_hint)
      : t.plaza.composer_hint;
  const deferredPlaceShortcutQuery = useDeferredValue(locationQuery.trim());
  const placeSuggestionsQuery = usePlaceSuggestions(
    deferredPlaceShortcutQuery,
    locationPickerVisible && deferredPlaceShortcutQuery.length >= 2,
  );
  const locationCandidates = (placeSuggestionsQuery?.data ?? []).filter(
    (place) => !selectedPlaces.some((selectedPlace) => selectedPlace.source_url === place.source_url),
  );
  const isSubmitting = Boolean(createPost?.isPending) || Boolean(updatePost?.isPending);

  useEffect(() => {
    if (!selectedPost || !data?.length) {
      return;
    }
    const refreshed = data.find((item) => item.id === selectedPost.id);
    if (refreshed && refreshed !== selectedPost) {
      setSelectedPost(refreshed);
    }
  }, [data, selectedPost]);

  const onPickImages = async () => {
    const remaining = MAX_MEDIA_ITEMS - mediaItems.length;
    if (remaining <= 0) {
      setComposerMessage(t.plaza.photo_limit);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      setIsUploadingMedia(true);
      setComposerMessage(null);
      const uploaded: CommunityPostMedia[] = [];
      if (!uploadMedia?.mutateAsync) {
        setComposerMessage(t.common.error);
        return;
      }
      for (const asset of result.assets.slice(0, remaining)) {
        const mimeType = asset.mimeType ?? 'image/jpeg';
        const fileName = asset.fileName ?? `plaza-${Date.now()}.jpg`;
        const media = await uploadMedia.mutateAsync({
          uri: asset.uri,
          mimeType,
          fileName,
        });
        uploaded.push(media);
      }
      setMediaItems((current) => [...current, ...uploaded].slice(0, MAX_MEDIA_ITEMS));
    } catch {
      setComposerMessage(t.common.error);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const removeMedia = (index: number) => {
    setMediaItems((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const resetComposerState = () => {
    reset(DEFAULT_FORM_VALUES);
    setMediaItems([]);
    setSelectedPlaces([]);
    setLocationQuery('');
    setLocationPickerVisible(false);
    setEditingPost(null);
    setComposerMessage(null);
  };

  const closeComposer = () => {
    resetComposerState();
    setComposerVisible(false);
  };

  const openComposerForCreate = () => {
    resetComposerState();
    setComposerVisible(true);
  };

  const openComposerForEdit = (post: CommunityPost) => {
    setSelectedPost(null);
    setEditingPost(post);
    setMediaItems(
      post.media_items.map((item) => ({
        id: item.id,
        media_url: item.media_url,
        mime_type: item.mime_type,
        sort_order: item.sort_order,
      }))
    );
    setSelectedPlaces(deriveTaggedPlacesFromPost(post));
    setLocationQuery('');
    setLocationPickerVisible(false);
    setComposerMessage(null);
    reset({
      post_type: post.post_type,
      title: post.title,
      body: post.body,
    });
    setComposerVisible(true);
  };

  const openLocationPicker = () => {
    setLocationPickerVisible(true);
    setLocationQuery('');
  };

  const closeLocationPicker = () => {
    setLocationPickerVisible(false);
    setLocationQuery('');
  };

  const applyPlaceSuggestion = (place: CommunityPlaceSuggestion) => {
    const selectedPlace = mapSuggestionToSelectedPlace(place);
    if (selectedPlaces.some((item) => item.source_url === selectedPlace.source_url)) {
      closeLocationPicker();
      return;
    }
    setSelectedPlaces((current) => [...current, selectedPlace]);
    setComposerMessage(null);
    closeLocationPicker();
  };

  const clearSelectedPlace = (sourceUrl: string) => {
    setSelectedPlaces((current) => current.filter((place) => place.source_url !== sourceUrl));
  };

  const onSubmit = (form: FormData) => {
    setComposerMessage(null);
    const payload = {
      post_type: form.post_type,
      title: form.title,
      body: form.body,
      source_url: selectedPlaces[0]?.source_url || undefined,
      selected_places: selectedPlaces,
      city: editingPost?.city ?? user?.city,
      identity_scope: editingPost?.identity_scope ?? user?.identity ?? 'all',
      media_items: mediaItems.map((item) => ({
        media_url: item.media_url,
        mime_type: item.mime_type ?? undefined,
      })),
    };

    if (editingPost) {
      if (!updatePost?.mutate) {
        setComposerMessage(t.common.error);
        return;
      }
      updatePost.mutate(payload, {
        onSuccess: (post) => {
          resetComposerState();
          setComposerVisible(false);
          setSelectedPost(post);
        },
      });
      return;
    }

    if (!createPost?.mutate) {
      setComposerMessage(t.common.error);
      return;
    }
    createPost.mutate(payload, {
      onSuccess: (post) => {
        resetComposerState();
        setPlazaBanner({
          tone: post.moderation_status === 'review' ? 'info' : 'success',
          message: post.moderation_status === 'review' ? t.plaza.review_notice : t.plaza.publish_success,
        });
        setComposerVisible(false);
      },
    });
  };

  useEffect(() => {
    if (!plazaBanner) return;
    const timeout = setTimeout(() => setPlazaBanner(null), 4000);
    return () => clearTimeout(timeout);
  }, [plazaBanner]);

  const filteredPosts = data;

  const columns = splitIntoColumns(filteredPosts);

  useEffect(() => {
    const impressionEvents = filteredPosts
      .filter((post) => Boolean(post.feed_context) && !impressionKeysRef.current.has(`${post.feed_context?.feed_request_id}:${post.id}`))
      .map((post) => {
        const impressionKey = `${post.feed_context?.feed_request_id}:${post.id}`;
        impressionKeysRef.current.add(impressionKey);
        return {
          event_name: 'plaza_impression' as const,
          session_id: getCommunitySessionId(),
          surface: 'plaza_feed' as const,
          post_id: post.id,
          feed_context: post.feed_context ?? undefined,
          content_context: post.content_context ?? undefined,
        };
      });

    if (impressionEvents.length > 0) {
      trackCommunityEvents(impressionEvents);
    }
  }, [filteredPosts, trackCommunityEvents]);

  return (
    <AppBackground>
    <SafeAreaView className="flex-1" edges={[]}>
      {/* Yellow band hero — same YumQuick treatment as Tasks/Buddy/auth. */}
      <View
        style={{
          backgroundColor: '#FFD17E',
          paddingTop: Math.max(insets.top + 14, 36),
          paddingBottom: 22,
          paddingHorizontal: 22,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_800ExtraBold',
              fontSize: 26,
              fontWeight: '800',
              color: '#FFFFFF',
              letterSpacing: -0.3,
            }}
          >
            {t.plaza.title}
          </Text>
          <LangPill />
        </View>
      </View>

      {plazaBanner ? (
        <GlassCard
          tone={plazaBanner.tone === 'success' ? 'cream' : 'cream'}
          radiusKey="lg"
          padding={14}
          style={{ marginHorizontal: 14, marginTop: 8 }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: plazaBanner.tone === 'success' ? '#3F8557' : '#9A6411',
            }}
          >
            {plazaBanner.message}
          </Text>
        </GlassCard>
      ) : null}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 14, paddingBottom: Math.max(insets.bottom + 180, 200) }}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.brandCoral} />
        }
        onScroll={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
          if (distanceFromBottom >= 600) return;
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          } else if (!hasNextPage && !isFetchingNextPage && !isFeedExhausted && !isRefilling) {
            // Snapshot exhausted — mint a new snapshot in the background, dedupe, append.
            refillFeed?.mutate();
          }
        }}
        scrollEventThrottle={250}
      >
        {isLoading && filteredPosts.length === 0 ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={colors.brandCoral} />
          </View>
        ) : null}

        {isError ? (
          <Text style={{ color: colors.danger, paddingHorizontal: 16, paddingVertical: 24, textAlign: 'center' }}>
            {t.common.error}
          </Text>
        ) : null}

        {filteredPosts.length > 0 ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              {columns.left.map((post) => (
                <CommunityPostCard key={post.id} post={post} onPress={setSelectedPost} />
              ))}
            </View>
            <View className="flex-1">
              {columns.right.map((post) => (
                <CommunityPostCard key={post.id} post={post} onPress={setSelectedPost} />
              ))}
            </View>
          </View>
        ) : !isLoading && !isError ? (
          <GlassCard tone="white" radiusKey="3xl" padding={32} style={{ alignItems: 'center', marginHorizontal: 12 }}>
            <Text style={{ fontSize: 28, opacity: 0.5, marginBottom: 12 }}>✦</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textMain, textAlign: 'center' }}>
              {t.plaza.empty}
            </Text>
          </GlassCard>
        ) : null}

        {isFetchingNextPage || isRefilling ? (
          <View className="items-center py-6">
            <ActivityIndicator size="small" color={colors.brandCoral} />
          </View>
        ) : isFeedExhausted ? (
          <View className="items-center py-6">
            <Text style={{ fontSize: 12, color: colors.textSubtle, letterSpacing: 0.4 }}>{t.plaza.feed_caught_up}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Post button — bumped to a real "main CTA" silhouette
          (2026-05-10): explicit height 60, icon 26, fontSize 22 ExtraBold.
          The old paddingV-only sizing read as a small tag; explicit height
          + bigger glyphs match the original big-pill design intent. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: Math.max(insets.bottom + 96, 116),
          alignItems: 'center',
          zIndex: 50,
        }}
      >
        <View
          style={{
            width: POST_BUTTON_WIDTH,
            height: POST_BUTTON_HEIGHT,
            borderRadius: POST_BUTTON_RADIUS,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            ...shadows.cta,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['#F67673', '#F67673']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: POST_BUTTON_RADIUS }]}
          />
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: 0, left: 18, right: 18, height: 1, backgroundColor: 'rgba(255,255,255,0.55)' }}
          />
          <ChalkIcon name="plus" size={POST_BUTTON_ICON_SIZE} color="#FFFFFF" />
          <Text
            style={{
              marginLeft: 8,
              fontSize: POST_BUTTON_FONT_SIZE,
              fontWeight: '800',
              color: '#FFFFFF',
              letterSpacing: 0,
            }}
          >
            {t.plaza.publish_note}
          </Text>
          <Pressable
            onPress={openComposerForCreate}
            accessibilityRole="button"
            accessibilityLabel={t.plaza.publish_note}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      <Modal visible={composerVisible} animationType="slide" onRequestClose={closeComposer}>
        <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: colors.bgCream }}>
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="px-5 pb-2 pt-2">
              <Pressable
                onPress={closeComposer}
                style={({ pressed }) => [
                  {
                    height: 44,
                    width: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.85)',
                    ...shadows.iconButton,
                  },
                  pressed ? { transform: [{ scale: 0.95 }] } : null,
                ]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.96)', 'rgba(255,250,245,0.78)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="chevron-back" size={24} color={colors.textMain} />
              </Pressable>
            </View>

            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 18,
                paddingTop: 6,
                paddingBottom: Math.max(insets.bottom + 148, 172),
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 14, paddingRight: 12, paddingBottom: 10 }}
                className="mb-7"
              >
                {mediaItems.map((item, index) => (
                  <View key={`${item.media_url}-${index}`} className="relative">
                    <Image
                      source={resolveMediaUrl(item.media_url) ?? item.media_url}
                      contentFit="cover"
                      transition={120}
                      style={{ width: 146, height: 146, borderRadius: 24 }}
                    />
                    <Pressable
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5"
                      onPress={() => removeMedia(index)}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}

                {mediaItems.length < MAX_MEDIA_ITEMS ? (
                  <Pressable
                    onPress={onPickImages}
                    disabled={isUploadingMedia}
                    className="items-center justify-center rounded-[24px] border border-neutral-200 bg-[#FCFCFC]"
                    style={{ width: 146, height: 146 }}
                  >
                    {isUploadingMedia ? (
                      <ActivityIndicator size="small" color="#F47C7C" />
                    ) : (
                      <Ionicons name="add" size={34} color="#D0D0D0" />
                    )}
                  </Pressable>
                ) : null}
              </ScrollView>

              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    placeholder={t.plaza.title_placeholder}
                    placeholderTextColor="#B9B9B9"
                    value={value}
                    onChangeText={onChange}
                    style={{
                      fontSize: 30,
                      lineHeight: 38,
                      color: '#111111',
                      fontWeight: '500',
                      marginBottom: 14,
                    }}
                  />
                )}
              />
              {errors.title ? <Text className="mb-2 text-sm text-danger">{errors.title.message}</Text> : null}

              <Controller
                control={control}
                name="body"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    placeholder={t.plaza.body_placeholder}
                    placeholderTextColor="#C4C4C4"
                    value={value}
                    onChangeText={onChange}
                    multiline
                    textAlignVertical="top"
                    style={{
                      minHeight: 220,
                      fontSize: 20,
                      lineHeight: 31,
                      color: '#2B2B2B',
                      paddingTop: 4,
                    }}
                  />
                )}
              />
              {errors.body ? <Text className="mb-2 text-sm text-danger">{errors.body.message}</Text> : null}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-6 mt-2"
                contentContainerStyle={{ gap: 10, paddingRight: 10 }}
              >
                {POST_TYPES.map((type) => {
                  const active = selectedType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setValue('post_type', type, { shouldValidate: true })}
                      style={({ pressed }) => [
                        {
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 999,
                          backgroundColor: active ? '#FFE8DA' : 'rgba(98,57,40,0.06)',
                          borderWidth: 1,
                          borderColor: active ? 'rgba(246,118,115,0.30)' : 'rgba(98,57,40,0.08)',
                        },
                        pressed ? { transform: [{ scale: 0.97 }] } : null,
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? colors.brandCoral : colors.textMuted,
                          fontSize: 13,
                          fontWeight: '700',
                          letterSpacing: 0.4,
                        }}
                      >
                        {active ? '# ' : ''}
                        {t.plaza[`type_${type}`]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View className="mb-2 border-t border-neutral-100 pt-2">
                <View className="min-h-[58px] flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={20} color="#242424" />
                    <Text className="ml-3 text-[16px] text-[#242424]">{t.plaza.composer_location_row}</Text>
                  </View>
                  <Pressable
                    className="rounded-full bg-[#F5F5F5] px-4 py-2.5"
                    onPress={openLocationPicker}
                  >
                    <Text className="text-sm font-semibold text-[#4B5563]">
                      {t.plaza.composer_add_location}
                    </Text>
                  </Pressable>
                </View>

                <View className="pb-3">
                  {selectedPlaces.length > 0 ? (
                    <View className="gap-3">
                      {selectedPlaces.map((place) => (
                        <View
                          key={`${place.source_url}-${place.name}`}
                          className="rounded-[22px] border border-neutral-200 bg-[#FCFCFC] px-4 py-4"
                        >
                          <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                              <Text className="text-[15px] font-semibold text-black">{place.name}</Text>
                              {place.subtitle ? (
                                <Text className="mt-1 text-[13px] leading-5 text-neutral-500">
                                  {place.subtitle}
                                </Text>
                              ) : null}
                            </View>

                            <Pressable
                              className="rounded-full bg-neutral-100 p-2"
                              onPress={() => clearSelectedPlace(place.source_url)}
                            >
                              <Ionicons name="close" size={14} color="#767676" />
                            </Pressable>
                          </View>

                          {place.short_description ? (
                            <Text className="mt-3 text-[13px] leading-6 text-neutral-700">
                              {place.short_description}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="pb-2 text-sm leading-6 text-neutral-400">
                      {t.plaza.composer_location_empty}
                    </Text>
                  )}
                </View>
              </View>

              <View className="min-h-[58px] flex-row items-center justify-between border-t border-neutral-100">
                <View className="flex-row items-center">
                  <Ionicons name="globe-outline" size={20} color="#242424" />
                  <Text className="ml-3 text-[16px] text-[#242424]">{t.plaza.composer_visibility_row}</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="mr-2 text-sm text-neutral-500">{t.plaza.composer_visibility_public}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
                </View>
              </View>

              <View className="border-t border-neutral-100 py-4">
                <View className="mb-2 flex-row items-center">
                  <Ionicons name="settings-outline" size={20} color="#242424" />
                  <Text className="ml-3 text-[16px] text-[#242424]">{t.plaza.composer_advanced_row}</Text>
                </View>
                <Text className="text-sm leading-6 text-neutral-500">{composerHint}</Text>
              </View>

              <View className="border-t border-neutral-100 py-4">
                <Text className="text-sm text-neutral-400">{t.plaza.composer_content_statement}</Text>
              </View>
            </ScrollView>

            <View
              className="absolute bottom-0 left-0 right-0 border-t border-neutral-100 bg-white px-5 pt-4"
              style={{ paddingBottom: Math.max(insets.bottom + 10, 20) }}
            >
              {composerMessage ? (
                <Text className="mb-3 text-sm" style={{ color: '#F47C7C' }}>
                  {composerMessage}
                </Text>
              ) : null}

              <View className="flex-row items-center gap-3">
                <View
                  style={{
                    height: 54,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 27,
                    borderWidth: 1,
                    borderColor: 'rgba(232,221,210,0.92)',
                    backgroundColor: 'rgba(255,255,255,0.96)',
                    ...shadows.iconButton,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textMain }}>
                    {editingPost ? t.common.cancel : t.plaza.composer_save_draft}
                  </Text>
                  <Pressable
                    onPress={closeComposer}
                    accessibilityRole="button"
                    accessibilityLabel={editingPost ? t.common.cancel : t.plaza.composer_save_draft}
                    style={StyleSheet.absoluteFill}
                  />
                </View>

                <View
                  style={{
                    height: 54,
                    flex: 1.9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 27,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 200, 175, 0.65)',
                    backgroundColor: '#F67673',
                    opacity: isSubmitting || isUploadingMedia ? 0.7 : 1,
                    ...shadows.cta,
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 }}>
                      {editingPost ? t.common.save : t.plaza.publish_note}
                    </Text>
                  )}
                  <Pressable
                    onPress={handleSubmit(onSubmit)}
                    disabled={isSubmitting || isUploadingMedia}
                    accessibilityRole="button"
                    accessibilityLabel={editingPost ? t.common.save : t.plaza.publish_note}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal visible={locationPickerVisible} animationType="slide" onRequestClose={closeLocationPicker}>
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
          <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
            <Pressable onPress={closeLocationPicker} className="h-11 w-11 items-center justify-center rounded-full">
              <Ionicons name="close" size={28} color="#111111" />
            </Pressable>
            <Text className="text-[18px] font-semibold text-black">{t.plaza.location_picker_title}</Text>
            <View className="h-11 w-11" />
          </View>

          <View className="px-6 pb-4">
            <Text className="text-center text-[28px] font-semibold text-black">
              {t.plaza.location_picker_prompt}
            </Text>
            <Text className="mt-2 text-center text-[16px] leading-6 text-neutral-500">
              {t.plaza.location_picker_hint}
            </Text>
          </View>

          <View className="px-5 pb-3">
            <View className="flex-row items-center rounded-[20px] bg-[#F3F4F7] px-4 py-3">
              <Ionicons name="search-outline" size={20} color="#8B8B8B" />
              <TextInput
                value={locationQuery}
                onChangeText={setLocationQuery}
                placeholder={t.plaza.location_picker_search_placeholder}
                placeholderTextColor="#A8A8A8"
                className="ml-3 flex-1 text-[17px] text-black"
                autoFocus
              />
              {locationQuery ? (
                <Pressable onPress={() => setLocationQuery('')}>
                  <Ionicons name="close" size={20} color="#9A9A9A" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
            {(placeSuggestionsQuery?.isLoading ?? false) ? (
              <View className="items-center py-10">
                <ActivityIndicator size="small" color="#F47C7C" />
                <Text className="mt-3 text-sm text-neutral-500">{t.plaza.place_helper_searching}</Text>
              </View>
            ) : null}

            {deferredPlaceShortcutQuery.length < 2 ? (
              <Text className="py-6 text-sm leading-6 text-neutral-400">
                {t.plaza.location_picker_empty}
              </Text>
            ) : null}

            {deferredPlaceShortcutQuery.length >= 2 && locationCandidates.length === 0 && !(placeSuggestionsQuery?.isLoading ?? false) ? (
              <Text className="py-6 text-sm leading-6 text-neutral-400">
                {t.plaza.place_helper_empty}
              </Text>
            ) : null}

            <View className="pb-12">
              {locationCandidates.map((place) => (
                <Pressable
                  key={`${place.source_url}-${place.name}`}
                  className="border-b border-neutral-100 py-5"
                  onPress={() => applyPlaceSuggestion(place)}
                >
                  <Text className="text-[18px] font-semibold text-black">{place.name}</Text>
                  {place.subtitle ? (
                    <Text className="mt-1 text-[15px] text-neutral-500">{place.subtitle}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <CommunityPostDetailModal
        post={selectedPost}
        visible={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        onEditPost={openComposerForEdit}
      />
    </SafeAreaView>
    </AppBackground>
  );
}
