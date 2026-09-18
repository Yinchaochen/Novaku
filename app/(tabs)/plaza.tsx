import { Ionicons } from '@expo/vector-icons';

import { fieldErrorText } from '../../lib/formErrors';
import { feedGrid } from '../../lib/feedGrid';
import { requireSignIn } from '../../store/signInPromptStore';
import { isCoverTemplateId, type CoverTemplateId } from '../../lib/postCover';
import { CoverTemplatePicker } from '../../components/community/CoverTemplatePicker';
import { PostCover } from '../../components/community/PostCover';
import { WIDE_LAYOUT_MIN_WIDTH } from '../../theme/layout';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FieldErrors, useForm } from 'react-hook-form';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
// Lazy-load the map-based picker so Expo Go doesn't try to mount
// react-native-maps until the user actually opens it. In Expo Go the map
// itself can't render (native module missing), but we don't even need to
// pay the import cost on app launch — the picker only mounts when
// `locationPickerVisible` flips to true inside <Suspense>.
const LocationPickerLazy = lazy(() => import('../../components/LocationPicker'));
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod/v4';

import { AppBackground } from '../../components/AppBackground';
import { ChalkIcon } from '../../components/ChalkIcon';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { FeedbackPressable } from '../../components/FeedbackPressable';
import { GlassCard } from '../../components/GlassCard';
import { LangPill } from '../../components/PageHeader';
import { useLanguage } from '../../context/LanguageContext';
import { captureSentryMessage } from '../../lib/sentry';
import { colors, shadows } from '../../theme/tokens';
import { compressImageForUpload } from '../../lib/imageCompression';
import { nextComposeButtonState } from '../../lib/composeButtonVisibility';
import { mapWithConcurrency } from '../../lib/mapWithConcurrency';
import { resolveMediaUrl } from '../../lib/media';
import { useGuideAutoAdvance, useProductGuide } from '../../features/guide/useProductGuide';
import { useGuideTarget } from '../../features/guide/guideTargets';
import { GuideSpotlight } from '../../components/guide/GuideSpotlight';
import { EventDateTimeField } from '../../components/datetime/EventDateTimeField';
import { EMPTY_EVENT_TIME, EventTimeValue } from '../../lib/eventTime';
import { isTooShortForAiSummary } from '../../features/community/aiSummary';
import {
  PreparedVideo,
  VideoPickPhase,
  VideoValidationError,
  processAndUploadVideo,
} from '../../features/community/videoPicker';
import { CommunityPostCard } from '../../features/community/CommunityPostCard';
import { FeedFilterRow } from '../../components/community/FeedFilterRow';
import { CommunityPostDetailModal, type CardOrigin } from '../../features/community/CommunityPostDetailModal';
import {
  CommunityPost,
  CommunitySelectedPlaceInput,
  CommunityPostMedia,
  getCommunitySessionId,
  useCommunityFeed,
  type CommunityFeedFilter,
  useCreateCommunityPost,
  useRefreshCommunityFeed,
  useTrackCommunityEvents,
  useUpdateCommunityPost,
  useUploadCommunityMedia,
} from '../../features/community/useCommunity';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { useAuthStore } from '../../store/authStore';
import { usePlazaComposeIntentStore } from '../../store/plazaComposeIntentStore';

const schema = z.object({
  post_type: z.enum(['experience', 'question', 'guide', 'warning', 'recommendation']),
  title: z.string().min(4, 'title_too_short').max(160, 'title_too_long'),
  body: z.string().min(12, 'body_too_short').max(4000, 'body_too_long'),
});

type FormData = z.infer<typeof schema>;

const POST_TYPES: FormData['post_type'][] = ['experience', 'question', 'guide', 'warning', 'recommendation'];
const MAX_MEDIA_ITEMS = 9;
const MEDIA_UPLOAD_CONCURRENCY = 2;
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

// A refetched feed can legitimately surface the same post in more than one
// query page (ranking shifts between snapshots on pull-to-refresh), so flatten
// defensively by post id — keeping first occurrence preserves display order.
// The feed loops: once the reader has been through everything, the next page
// starts a new round with a re-seeded order rather than ending. So a post can
// legitimately appear twice, and identity is (round, id), not id. Deduping on
// id alone would delete round two entirely and the loop would look broken.
function feedItemKey(post: CommunityPost): string {
  return post._feed_key ?? post.id;
}

function dedupeFeedItems(posts: CommunityPost[]): CommunityPost[] {
  const seen = new Set<string>();
  const out: CommunityPost[] = [];
  for (const post of posts) {
    const key = feedItemKey(post);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(post);
  }
  return out;
}

async function noopRefetch() {
  return undefined;
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

// IOS-LOGIN-113: standalone fallback component so we can attach a useEffect
// that emits a breadcrumb when the spinner actually mounts. If a Sentry
// session shows plaza.add_location.tap → plaza.suspense.fallback_visible
// but no LocationPicker.module_loaded afterward, the lazy import is hung.
function LocationPickerSuspenseFallback() {
  useEffect(() => {
    captureSentryMessage('plaza.suspense.fallback_visible', {
      platform: Platform.OS,
    });
  }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }}>
      <ActivityIndicator size="large" color={colors.brandCoral} />
    </View>
  );
}

export default function PlazaScreen() {
  const { t } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  // The wall is two columns on a phone and follows its own width on anything
  // wider — a browser, a tablet, a phone turned sideways. Its own width, not
  // the window's: past WIDE_LAYOUT_MIN_WIDTH the tab rail has already taken a
  // slice off the left, and a wall that counted the window would lay out one
  // column too many and centre itself off to the right. See lib/feedGrid.
  const { width: windowWidth } = useWindowDimensions();
  const [wallWidth, setWallWidth] = useState(0);
  const grid = feedGrid(wallWidth || windowWidth);
  // With the tabs on a rail there is no bar along the bottom to clear, so the
  // room reserved for one is just the last screen of the wall left empty.
  const railed = windowWidth >= WIDE_LAYOUT_MIN_WIDTH;
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
  // Which kind of post the reader asked for, or null for everything. Sent to
  // the backend rather than applied here — see communityFeedQueryKey.
  const [feedFilter, setFeedFilter] = useState<CommunityFeedFilter>(null);
  const feedQuery = useCommunityFeed(feedFilter);
  const pages = feedQuery?.data?.pages;
  const data = dedupeFeedItems(
    pages?.flatMap((page) =>
      page.items.map((item) =>
        page.feed_round ? { ...item, _feed_key: `${page.feed_round}:${item.id}` } : item,
      ),
    ) ?? [],
  );
  const isLoading = feedQuery?.isLoading ?? false;
  const isError = feedQuery?.isError ?? false;
  const isFetching = feedQuery?.isFetching ?? false;
  const isFetchingNextPage = feedQuery?.isFetchingNextPage ?? false;
  const hasNextPage = feedQuery?.hasNextPage ?? false;
  const refetch = feedQuery?.refetch ?? noopRefetch;
  const refreshFeed = useRefreshCommunityFeed(feedFilter);
  const fetchNextPage = feedQuery?.fetchNextPage ?? (() => Promise.resolve(undefined));
  // Single cursor-paginated snapshot is the only feed source now; "caught up" =
  // the cursor returned no next page (no separate refill mechanism to track).
  const isFeedCaughtUp = data.length > 0 && !hasNextPage;
  // Honest empty-city state (D-061): the viewer picked a city but nothing in
  // the served feed is from it — label the global fallback instead of
  // silently passing it off as local.
  const localPoolEmpty = Boolean(pages?.[0]?.local_pool_empty) && data.length > 0;
  // Ranking now reserves places for posts this viewer has not seen (D-065
  // step A); the count says so, rather than leaving them to spot it. First
  // page only — page two is all new by definition and the pill would lie.
  const unseenCount = pages?.[0]?.unseen_on_page ?? 0;
  const showNewPill = unseenCount > 0 && data.length > 0;
  const createPost = useCreateCommunityPost();
  const updatePost = useUpdateCommunityPost(editingPost?.id ?? null);
  const trackCommunityEvents = useTrackCommunityEvents()?.mutate ?? (() => undefined);
  const uploadMedia = useUploadCommunityMedia();
  const [mediaItems, setMediaItems] = useState<CommunityPostMedia[]>([]);
  // D-033: a video post carries exactly one video and no images.
  const [videoDraft, setVideoDraft] = useState<PreparedVideo | null>(null);
  const [videoPhase, setVideoPhase] = useState<{ phase: VideoPickPhase; progress: number } | null>(null);
  const [composerMessage, setComposerMessage] = useState<string | null>(null);
  const [plazaBanner, setPlazaBanner] = useState<{ tone: 'success' | 'info'; message: string } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const keyboardHeight = useKeyboardHeight(composerVisible);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  // Where the card that opened the detail sat, so a wide layout grows the
  // sheet out of it instead of dropping it in from nowhere (D-141).
  const [detailOrigin, setDetailOrigin] = useState<CardOrigin | null>(null);
  const [selectedPlaces, setSelectedPlaces] = useState<CommunitySelectedPlaceInput[]>([]);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [aiSummaryEnabled, setAiSummaryEnabled] = useState(true);
  // D-141: the drawn cover a text post wears. null = the papery default, which
  // is also what every post written before this picker existed carries.
  const [coverTemplate, setCoverTemplate] = useState<CoverTemplateId | null>(null);
  const [coverPaletteIndex, setCoverPaletteIndex] = useState(0);
  // Optional event clock on the post (D-105). Empty = an ordinary post.
  const [eventTime, setEventTime] = useState<EventTimeValue>(EMPTY_EVENT_TIME);
  const guide = useProductGuide();

  // The Post button gets out of the reader's way on the way down and comes
  // back on the way up. The rule itself lives in lib/composeButtonVisibility
  // where it can be tested; this is the animation around it.
  const postButtonOffset = useRef(new Animated.Value(0)).current;
  const postButtonHidden = useRef(false);
  const lastScrollY = useRef(0);
  const guideActive = guide.step !== null;
  const handleFeedScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const decision = nextComposeButtonState({
      y: event.nativeEvent.contentOffset.y,
      lastY: lastScrollY.current,
      hidden: postButtonHidden.current,
      guideActive,
    });
    lastScrollY.current = decision.lastY;
    if (postButtonHidden.current === decision.hidden) return;
    postButtonHidden.current = decision.hidden;
    Animated.timing(postButtonOffset, {
      toValue: decision.hidden ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };
  const composeEntryTargetRef = useGuideTarget('compose_entry');
  const photoTargetRef = useGuideTarget('photo');
  const titleTargetRef = useGuideTarget('title');
  const bodyTargetRef = useGuideTarget('body');
  const locationTargetRef = useGuideTarget('location');
  const publishTargetRef = useGuideTarget('publish');
  const impressionKeysRef = useRef<Set<string>>(new Set());
  const composerScrollRef = useRef<ScrollView>(null);

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
  const watchedTitle = watch('title');
  const watchedBody = watch('body');
  // D-050 walkthrough: advance on the user's real composer actions.
  useGuideAutoAdvance({
    composerVisible,
    mediaCount: mediaItems.length + (videoDraft ? 1 : 0),
    title: watchedTitle ?? '',
    body: watchedBody ?? '',
    placesCount: selectedPlaces.length,
  });
  // The button asks the schema instead of repeating "4" and "12" — pressing
  // Post on an empty form used to do nothing visible at all, because the two
  // error lines render beside the fields, twenty screens above the button.
  const canSubmit = schema
    .pick({ title: true, body: true })
    .safeParse({ title: watchedTitle ?? '', body: watchedBody ?? '' }).success;
  const composerContentTooShort = isTooShortForAiSummary(watchedTitle ?? '', watchedBody ?? '');
  // What the cover will look like for what is written so far. A real
  // CommunityPost shape rather than a mock, because PostCover reads the same
  // fields the feed will hand it — the preview lies the moment it does not.
  const composerPreviewPost = {
    id: editingPost?.id ?? 'composer-preview',
    post_type: selectedType ?? 'experience',
    title: watchedTitle ?? '',
    body: watchedBody ?? '',
    odyssey_slug: editingPost?.odyssey_slug ?? null,
    theme: editingPost?.theme ?? null,
    cover_template: coverTemplate,
    cover_palette: coverPaletteIndex,
  } as unknown as CommunityPost;
  const composerHint = t.plaza.composer_hint;
  // Place search now happens inside <LocationPicker> via Google Places
  // Autocomplete; the legacy Nominatim hook (usePlaceSuggestions) and the
  // text-only candidate list have been retired along with the old modal.
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

  const videoErrorMessage = (error: unknown): string => {
    if (error instanceof VideoValidationError) {
      if (error.code === 'too_long') return t.video.too_long;
      if (error.code === 'too_large') return t.video.too_large;
      return t.video.unsupported;
    }
    const code = (error as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    if (code === 'video.upload_disabled') return t.video.upload_disabled;
    if (code === 'video.rate_limited') return t.video.rate_limited;
    return t.video.upload_failed;
  };

  const onPickVideo = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!uploadMedia?.mutateAsync) {
      setComposerMessage(t.common.error);
      return;
    }
    setIsUploadingMedia(true);
    setComposerMessage(mediaItems.length > 0 ? t.video.replaced_images_hint : null);
    setMediaItems([]);
    try {
      const prepared = await processAndUploadVideo({
        asset,
        uploadImage: (input) => uploadMedia.mutateAsync(input),
        onPhase: (phase, progress) => setVideoPhase({ phase, progress }),
      });
      setVideoDraft(prepared);
    } catch (error) {
      setComposerMessage(videoErrorMessage(error));
    } finally {
      setVideoPhase(null);
      setIsUploadingMedia(false);
    }
  };

  const onPickImages = async () => {
    const remaining = MAX_MEDIA_ITEMS - mediaItems.length;
    if (remaining <= 0) {
      setComposerMessage(t.plaza.photo_limit);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const videoAsset = result.assets.find((asset) => asset.type === 'video');
      if (videoAsset) {
        await onPickVideo(videoAsset);
        return;
      }

      setIsUploadingMedia(true);
      setComposerMessage(null);
      if (!uploadMedia?.mutateAsync) {
        setComposerMessage(t.common.error);
        return;
      }
      // MS-16: compress each pick client-side (longest edge → 1600px, JPEG
      // q0.7) then upload at most two at a time so weak uplinks are not flooded.
      const uploaded = await mapWithConcurrency(
        result.assets.slice(0, remaining),
        MEDIA_UPLOAD_CONCURRENCY,
        async (asset) => {
          const compressed = await compressImageForUpload({
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            fileName: asset.fileName,
            fileSize: asset.fileSize,
          });
          return uploadMedia.mutateAsync(compressed);
        },
      );
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
    setVideoDraft(null);
    setVideoPhase(null);
    setSelectedPlaces([]);
    setLocationPickerVisible(false);
    setEditingPost(null);
    setComposerMessage(null);
    setAiSummaryEnabled(true);
    setEventTime(EMPTY_EVENT_TIME);
  };

  const closeComposer = () => {
    resetComposerState();
    setComposerVisible(false);
  };

  const openComposerForCreate = () => {
    resetComposerState();
    setComposerVisible(true);
  };

  // One-shot composer handoffs: the zero-result search CTA asks a question
  // (PLAZA-SEARCH-001); the post detail screen asks to edit when it was opened
  // somewhere without a composer (Profile, a user page, search, a shared link).
  const pendingComposeIntent = usePlazaComposeIntentStore((state) => state.intent);
  useEffect(() => {
    if (!pendingComposeIntent) {
      return;
    }
    const intent = usePlazaComposeIntentStore.getState().consume();
    if (!intent) {
      return;
    }
    if (intent.kind === 'edit') {
      openComposerForEdit(intent.post);
      return;
    }
    openComposerForCreate();
    setValue('post_type', intent.postType);
    setValue('title', intent.title.slice(0, 160));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingComposeIntent]);

  const openComposerForEdit = (post: CommunityPost) => {
    setSelectedPost(null);
    setEditingPost(post);
    setMediaItems(
      post.media_items.map((item) => ({
        id: item.id,
        media_url: item.media_url,
        thumb_url: item.thumb_url,
        mime_type: item.mime_type,
        sort_order: item.sort_order,
      }))
    );
    setSelectedPlaces(deriveTaggedPlacesFromPost(post));
    setLocationPickerVisible(false);
    setComposerMessage(null);
    setAiSummaryEnabled(post.ai_summary_enabled ?? true);
    setCoverTemplate(isCoverTemplateId(post.cover_template) ? post.cover_template : null);
    setCoverPaletteIndex(post.cover_palette ?? 0);
    // Prefill the event clock, or editing the title would silently clear it.
    setEventTime({ start: post.event_starts_at ?? null, end: post.event_ends_at ?? null });
    reset({
      post_type: post.post_type,
      title: post.title,
      body: post.body,
    });
    setComposerVisible(true);
  };

  const openPostFromFeed = (post: CommunityPost, origin?: CardOrigin) => {
    setDetailOrigin(origin ?? null);
    setSelectedPost(post);
  };

  const openLocationPicker = () => {
    // IOS-LOGIN-113: first link in the diagnostic chain. Sentry session
    // showing this breadcrumb but missing LocationPicker.module_loaded
    // means the lazy() import is hanging/rejecting before user code runs.
    // Build 39: promoted to captureSentryMessage so the chain uploads as
    // discrete Issues even when the native side dies silently.
    captureSentryMessage('plaza.add_location.tap', { platform: Platform.OS });
    setLocationPickerVisible(true);
  };

  const closeLocationPicker = () => {
    setLocationPickerVisible(false);
  };

  // LocationPicker emits the final CommunitySelectedPlaceInput directly —
  // no need to map through CommunityPlaceSuggestion. De-dupe by source_url
  // so the same place can't be added twice.
  const applyMapPickerSelection = (place: CommunitySelectedPlaceInput) => {
    setSelectedPlaces((current) => {
      if (current.some((item) => item.source_url === place.source_url)) {
        return current;
      }
      return [...current, place];
    });
    setComposerMessage(null);
    closeLocationPicker();
  };

  const clearSelectedPlace = (sourceUrl: string) => {
    setSelectedPlaces((current) => current.filter((place) => place.source_url !== sourceUrl));
  };

  const plazaErrorMessage = (err: unknown, scope: 'create' | 'update'): string => {
    const errBody = (err as { response?: { data?: { error?: { code?: string; message?: string } }; status?: number } })?.response;
    const status = errBody?.status;
    const code = errBody?.data?.error?.code;
    const detail = errBody?.data?.error?.message;
    console.log(`[plaza.${scope}] error`, { status, code, detail, raw: err });
    if (code === 'post.moderation_rejected') {
      return t.plaza.moderation_rejected_post;
    }
    if (status === undefined) {
      return t.common.network_error;
    }
    if (status >= 500) {
      return t.common.server_error;
    }
    return t.common.error;
  };

  const onSubmit = (form: FormData) => {
    setComposerMessage(null);
    const payload = {
      post_type: form.post_type,
      title: form.title,
      body: form.body,
      source_url: selectedPlaces[0]?.source_url || undefined,
      selected_places: selectedPlaces,
      save_places_as_odysseys: false,
      ai_summary_enabled: aiSummaryEnabled,
      cover_template: coverTemplate,
      cover_palette: coverTemplate ? coverPaletteIndex : null,
      event_starts_at: eventTime.start,
      event_ends_at: eventTime.end,
      city: editingPost?.city ?? user?.city,
      identity_scope: editingPost?.identity_scope ?? user?.identity ?? 'all',
      media_items: videoDraft
        ? [
            {
              media_url: videoDraft.media.media_url,
              thumb_url: videoDraft.media.thumb_url ?? undefined,
              mime_type: videoDraft.media.mime_type ?? undefined,
              duration_seconds: videoDraft.media.duration_seconds ?? undefined,
            },
          ]
        : mediaItems.map((item) => ({
            media_url: item.media_url,
            thumb_url: item.thumb_url ?? undefined,
            mime_type: item.mime_type ?? undefined,
            duration_seconds: item.duration_seconds ?? undefined,
            // /media/upload measured these from the bytes and handed them
            // back; the composer was dropping them on the floor, so every
            // post reached the database with no picture size and every card
            // guessed its shape from a hash (D-078's reason for existing).
            width: item.width ?? undefined,
            height: item.height ?? undefined,
          })),
      moderation_frame_urls: videoDraft ? videoDraft.frameUrls : undefined,
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
        onError: (err) => {
          setComposerMessage(plazaErrorMessage(err, 'update'));
        },
      });
      return;
    }

    if (!createPost?.mutate) {
      setComposerMessage(t.common.error);
      return;
    }
    // MS-16: images are already uploaded (media_items hold R2 URLs), so the
    // submit itself is a fast JSON call. Close the composer immediately and
    // show a "publishing…" banner instead of blocking on the round-trip. On
    // error we reopen the composer — the draft is intact because we only
    // resetComposerState() on success.
    setComposerVisible(false);
    setPlazaBanner({ tone: 'info', message: t.plaza.publishing });
    createPost.mutate(payload, {
      onSuccess: (post) => {
        resetComposerState();
        // D-033 XHS model: a pending video post is live for its author right
        // away and enters the public feed once frame review approves.
        setPlazaBanner({
          tone: post.moderation_status === 'approved' ? 'success' : 'info',
          message:
            post.moderation_status === 'pending'
              ? t.video.publish_pending_notice
              : post.moderation_status === 'review'
                ? t.plaza.review_notice
                : t.plaza.publish_success,
        });
      },
      onError: (err) => {
        setPlazaBanner(null);
        setComposerVisible(true);
        setComposerMessage(plazaErrorMessage(err, 'create'));
      },
    });
  };

  // Whoever presses Post is at the bottom of the form; the errors render at the
  // top, beside the two fields. Say it where the press happened, then go there.
  const onInvalid = (formErrors: FieldErrors<FormData>) => {
    setComposerMessage(
      fieldErrorText(t.validation, formErrors.title ?? formErrors.body) ?? t.common.error,
    );
    composerScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Guided publish: the confirm sheet dispatches the real submit, and the
  // walkthrough only completes once a valid form actually went out.
  const submitFromGuideConfirm = handleSubmit((form) => {
    onSubmit(form);
    guide.completeWalkthrough('action');
  }, onInvalid);

  // Final Continue on the publish step: the tour is over. With an untouched
  // draft that means closing the composer and landing back on Plaza; a real
  // draft stays open — ending a tutorial must never destroy typed content.
  const finishGuideFromPublishStep = () => {
    guide.completeWalkthrough('dismiss');
    const pristine =
      !(watchedTitle ?? '').trim() &&
      !(watchedBody ?? '').trim() &&
      mediaItems.length === 0 &&
      selectedPlaces.length === 0;
    if (pristine) {
      closeComposer();
    }
  };

  useEffect(() => {
    if (!plazaBanner) return;
    const timeout = setTimeout(() => setPlazaBanner(null), 4000);
    return () => clearTimeout(timeout);
  }, [plazaBanner]);

  const filteredPosts = data;

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

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (locationPickerVisible) {
        closeLocationPicker();
        return true;
      }
      if (composerVisible) {
        closeComposer();
        return true;
      }
      if (selectedPost) {
        setSelectedPost(null);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [closeComposer, closeLocationPicker, composerVisible, locationPickerVisible, selectedPost]);

  return (
    <AppBackground>
    <SafeAreaView testID="screen.plaza" className="flex-1" edges={[]}>
      {/* Yellow band hero — same YumQuick treatment as Tasks/Buddy/auth.
          zIndex lifts it above the feed so cards scroll UNDER the curved edge:
          the corner cutouts then show live content instead of a dead white
          wedge (lisum 2026-08-08). */}
      <View
        style={{
          backgroundColor: '#FFD17E',
          paddingTop: Math.max(insets.top + 12, 34),
          // Was 22. The band is ~100dp of screen that never scrolls away, and
          // it held a word and three icons; the space it keeps now goes to the
          // filter row under the title, which is a way to browse rather than a
          // decoration.
          paddingBottom: 12,
          paddingHorizontal: 22,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          zIndex: 2,
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
            {t.plaza.header_title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Permanent walkthrough entry (D-050): re-runnable any time. */}
            <FeedbackPressable
              // The walkthrough ends in the composer, so it needs an account too.
              onPress={() => requireSignIn(() => guide.startWalkthrough({ composerOpen: false }))}
              accessibilityLabel={t.guide.take_the_tour}
              testID="plaza.guide-entry"
              hitSlop={8}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
              }}
              pressedStyle={{ opacity: 0.7 }}
            >
              <Ionicons name="help" size={18} color="#FFFFFF" />
            </FeedbackPressable>
            <FeedbackPressable
              onPress={() => router.push('/plaza/search' as unknown as Href)}
              accessibilityLabel={t.plaza.search_entry_a11y}
              testID="plaza.search-entry"
              hitSlop={8}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
              }}
              pressedStyle={{ opacity: 0.7 }}
            >
              <Ionicons name="search" size={18} color="#FFFFFF" />
            </FeedbackPressable>
            <LangPill />
          </View>
        </View>

        <FeedFilterRow value={feedFilter} onChange={setFeedFilter} />
      </View>

      {plazaBanner ? (
        <GlassCard
          tone={plazaBanner.tone === 'success' ? 'cream' : 'cream'}
          radiusKey="lg"
          padding={14}
          style={{ marginHorizontal: 14, marginTop: 8, zIndex: 2 }}
        >
          <Text
            testID="plaza.banner"
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
      {/* FlashList recycles cards as they leave the viewport. The previous
          ScrollView + .map() kept every loaded page mounted, so by page 3 all
          60 cards — and all 60 image requests — were live at once.
          The -32 tuck slides the list under the hero's rounded edge (see
          zIndex note above); paddingTop compensates so resting layout is
          unchanged. */}
      <View
        style={{ flex: 1, marginTop: -32, zIndex: 0 }}
        onLayout={(event) => setWallWidth(event.nativeEvent.layout.width)}
      >
      <FlashList
        data={filteredPosts}
        masonry
        // FlashList measures its columns once; a window resized across a
        // breakpoint has to hand it a new list rather than a new prop.
        key={`feed-${grid.columns}`}
        numColumns={grid.columns}
        keyExtractor={feedItemKey}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 3 }}>
            <CommunityPostCard
              post={item}
              onPress={openPostFromFeed}
              columnWidth={grid.columnWidth}
            />
          </View>
        )}
        // 3px either side of each card plus 6 here = a 6px gutter between
        // columns and 6px to the screen edge, so the wall reads as one surface
        // rather than as cards floating apart.
        contentContainerStyle={{
          paddingHorizontal: grid.sidePadding,
          // 46 over-compensated the -32 tuck by 14dp of dead space above the
          // first card. That is 14dp taken off every screen of feed, on a
          // surface where a whole card costs about 300.
          paddingTop: 34,
          paddingBottom: railed ? 48 : Math.max(insets.bottom + 180, 200),
        }}
        ListHeaderComponent={
          showNewPill || localPoolEmpty ? (
            <View>
              {showNewPill ? (
                <View
                  testID="plaza.new-posts-pill"
                  style={{
                    alignSelf: 'center',
                    marginBottom: 10,
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    backgroundColor: colors.brandCoral,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' }}>
                    {t.plaza.new_posts_pill.replace('{count}', String(unseenCount))}
                  </Text>
                </View>
              ) : null}
              {localPoolEmpty ? (
            <View
              testID="plaza.local-pool-empty"
              style={{
                marginHorizontal: 10,
                marginBottom: 10,
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: 'rgba(255, 159, 110, 0.14)',
              }}
            >
              <Text style={{ fontSize: 12.5, lineHeight: 18, color: '#9A6411', fontWeight: '600' }}>
                {t.plaza.feed_no_local_content}
              </Text>
                </View>
              ) : null}
            </View>
          ) : null
        }
        // D-150: NOT on a wide layout. A pull is a deliberate gesture on a
        // phone; in a browser it is what happens every single time the reader
        // scrolls back up to the top with a wheel or a trackpad. And a refresh
        // is not a cosmetic reload — it sends `refresh: true`, which the
        // backend reads as "the reader asked for something else" and stops
        // holding the top of the feed in place (D-079). lisum filmed the
        // result: at 7.0s the wall is still, at 7.2s a card from further down
        // is at the head and everything he was reading has slid down a row.
        refreshControl={
          railed ? undefined : (
          <RefreshControl
            // isFetching alone is also true while the next page loads, which
            // put the top spinner on every scroll-to-load — and left it there,
            // because the feed now always has a next page.
            refreshing={isFetching && !isFetchingNextPage && !isLoading}
            onRefresh={refreshFeed}
            tintColor={colors.brandCoral}
            progressViewOffset={40}
          />
          )
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.6}
        onScroll={handleFeedScroll}
        scrollEventThrottle={32}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={colors.brandCoral} />
            </View>
          ) : isError ? (
            <View style={{ alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24, gap: 14 }}>
              <Text style={{ color: colors.danger, textAlign: 'center' }}>{t.common.error}</Text>
              <Pressable
                onPress={() => refetch()}
                accessibilityRole="button"
                testID="plaza.feed-retry"
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 9,
                  borderRadius: 999,
                  backgroundColor: colors.brandCoral,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t.common.retry}</Text>
              </Pressable>
            </View>
          ) : (
            <GlassCard tone="white" radiusKey="3xl" padding={32} style={{ alignItems: 'center', marginHorizontal: 12 }}>
              <Text style={{ fontSize: 28, opacity: 0.5, marginBottom: 12 }}>✦</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textMain, textAlign: 'center' }}>
                {t.plaza.empty}
              </Text>
            </GlassCard>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-6">
              <ActivityIndicator size="small" color={colors.brandCoral} />
            </View>
          ) : isFeedCaughtUp ? (
            <View className="items-center py-6">
              <Text style={{ fontSize: 12, color: colors.textSubtle, letterSpacing: 0.4 }}>{t.plaza.feed_caught_up}</Text>
            </View>
          ) : null
        }
      />
      </View>

      {/* Floating Post button — bumped to a real "main CTA" silhouette
          (2026-05-10): explicit height 60, icon 26, fontSize 22 ExtraBold.
          The old paddingV-only sizing read as a small tag; explicit height
          + bigger glyphs match the original big-pill design intent. */}
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: railed ? 32 : Math.max(insets.bottom + 96, 116),
          alignItems: 'center',
          zIndex: 50,
          opacity: postButtonOffset.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            {
              translateY: postButtonOffset.interpolate({
                inputRange: [0, 1],
                // Past its own height plus the tab bar, so nothing of it is
                // left peeking over the bar while it is meant to be gone.
                outputRange: [0, POST_BUTTON_HEIGHT + 60],
              }),
            },
          ],
        }}
      >
        <View
          ref={composeEntryTargetRef}
          collapsable={false}
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
            testID="plaza.composer.open"
            // Writing a post needs an account; a guest is asked first (D-151).
            onPress={() => requireSignIn(openComposerForCreate)}
            accessibilityRole="button"
            accessibilityLabel={t.plaza.publish_note}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </Animated.View>

      {/* Spotlight for the compose-entry step; the scrim never eats touches.
          Continue on this step performs the real forward action for the user:
          it opens the composer. */}
      <GuideSpotlight layer="plaza" onContinueFromEntry={openComposerForCreate} />

      <Modal
        visible={composerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={locationPickerVisible ? closeLocationPicker : closeComposer}
      >
        {/* IOS-LOGIN-113 Build 39: render LocationPicker in-place inside the
            composer Modal instead of as a stacked second Modal. iOS 26 strict
            UIScene lifecycle silently failed to present the nested fullScreen
            modal even though native MapView mounted — Build 38 syslog showed
            CoreLocation full init + GMS SDK auth handshake succeeding, but
            no tile-fetch burst (the modal never got a visible frame to
            render). Single Modal mirrors Twitter / Instagram approach and
            sidesteps the iOS-26 nested-UIScene present-failure entirely.

            IOS-LOGIN-109: iOS Modal opens in a separate UIWindow whose
            safe-area insets aren't reliably forwarded to
            react-native-safe-area-context's SafeAreaView. The composer branch
            bypasses it via paddingTop: insets.top; the LocationPicker branch
            renders its own SafeAreaView header layer. */}
        {locationPickerVisible ? (
          <ErrorBoundary onReset={closeLocationPicker}>
            <Suspense fallback={<LocationPickerSuspenseFallback />}>
              <LocationPickerLazy
                initialLatitude={user?.latitude ?? null}
                initialLongitude={user?.longitude ?? null}
                initialPlaceName={user?.city ?? null}
                outerInsets={insets}
                onConfirm={applyMapPickerSelection}
                onCancel={closeLocationPicker}
              />
            </Suspense>
          </ErrorBoundary>
        ) : (
        <View
          style={{
            flex: 1,
            paddingTop: insets.top,
            // Nothing else shrinks this window for the keyboard (useKeyboardHeight).
            paddingBottom: keyboardHeight,
            backgroundColor: colors.bgCream,
          }}
        >
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="px-5 pb-2 pt-2">
              <FeedbackPressable
                onPress={closeComposer}
                style={{
                  height: 44,
                  width: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.85)',
                  ...shadows.iconButton,
                }}
                pressedStyle={{ transform: [{ scale: 0.95 }] }}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.96)', 'rgba(255,250,245,0.78)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="chevron-back" size={24} color={colors.textMain} />
              </FeedbackPressable>
            </View>

            <ScrollView
              ref={composerScrollRef}
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

                {videoDraft ? (
                  <View className="relative">
                    <Image
                      source={resolveMediaUrl(videoDraft.media.thumb_url) ?? videoDraft.media.thumb_url}
                      contentFit="cover"
                      transition={120}
                      style={{ width: 146, height: 146, borderRadius: 24, backgroundColor: '#101010' }}
                    />
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.92)" />
                    </View>
                    <View
                      pointerEvents="none"
                      className="absolute bottom-2 left-2 rounded-full px-2 py-0.5"
                      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' }}>
                        {`${Math.floor((videoDraft.media.duration_seconds ?? 0) / 60)}:${String(
                          (videoDraft.media.duration_seconds ?? 0) % 60,
                        ).padStart(2, '0')}`}
                      </Text>
                    </View>
                    <Pressable
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5"
                      onPress={() => setVideoDraft(null)}
                      testID="plaza.composer.video.remove"
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : null}

                {mediaItems.length < MAX_MEDIA_ITEMS && !videoDraft ? (
                  <Pressable
                    ref={photoTargetRef}
                    onPress={onPickImages}
                    disabled={isUploadingMedia}
                    className="items-center justify-center rounded-[24px] border border-neutral-200 bg-[#FCFCFC]"
                    style={{ width: 146, height: 146 }}
                  >
                    {isUploadingMedia ? (
                      <View style={{ alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#F47C7C" />
                        {videoPhase ? (
                          <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#B08B7E' }}>
                            {videoPhase.phase === 'compressing'
                              ? t.video.phase_compressing
                              : videoPhase.phase === 'frames'
                                ? t.video.phase_frames
                                : t.video.phase_uploading}
                            {` ${Math.round(videoPhase.progress * 100)}%`}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: 10 }}>
                        <Ionicons name="image-outline" size={30} color={colors.brandCoral} />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: colors.textMuted,
                            textAlign: 'center',
                          }}
                        >
                          {t.plaza.add_photo}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ) : null}
              </ScrollView>

              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    ref={titleTargetRef}
                    testID="plaza.composer.title"
                    placeholder={t.plaza.title_placeholder}
                    placeholderTextColor="#B9B9B9"
                    value={value}
                    onChangeText={onChange}
                    style={{
                      fontSize: 30,
                      lineHeight: 38,
                      // Android ignores placeholderTextColor here and draws the
                      // hint in the text colour, which made an empty composer
                      // read as a written one (D-127). An empty field has no
                      // text of its own to tint.
                      color: value ? '#111111' : '#B9B9B9',
                      fontWeight: '500',
                      marginBottom: 14,
                    }}
                  />
                )}
              />
              {errors.title ? <Text className="mb-2 text-sm text-danger">{fieldErrorText(t.validation, errors.title)}</Text> : null}

              <Controller
                control={control}
                name="body"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    ref={bodyTargetRef}
                    testID="plaza.composer.body"
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
                      color: value ? '#2B2B2B' : '#C4C4C4',
                      paddingTop: 4,
                    }}
                  />
                )}
              />
              {errors.body ? <Text className="mb-2 text-sm text-danger">{fieldErrorText(t.validation, errors.body)}</Text> : null}

              <View className="mb-6 mt-2 flex-row flex-wrap" style={{ gap: 10 }}>
                {POST_TYPES.map((type) => {
                  const active = selectedType === type;
                  return (
                    <FeedbackPressable
                      key={type}
                      onPress={() => setValue('post_type', type, { shouldValidate: true })}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 999,
                        backgroundColor: active ? '#FFE8DA' : 'rgba(98,57,40,0.06)',
                        borderWidth: 1,
                        borderColor: active ? 'rgba(246,118,115,0.30)' : 'rgba(98,57,40,0.08)',
                      }}
                      pressedStyle={{ transform: [{ scale: 0.97 }] }}
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
                    </FeedbackPressable>
                  );
                })}
              </View>

              <View className="mb-2 border-t border-neutral-100 pt-2">
                <View className="min-h-[58px] flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={20} color="#242424" />
                    <Text className="ml-3 text-[16px] text-[#242424]">{t.plaza.composer_location_row}</Text>
                  </View>
                  <Pressable
                    ref={locationTargetRef}
                    onPress={openLocationPicker}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 999,
                      // Match the coral pill used for the type chips above —
                      // keeps the "actionable" affordance consistent across
                      // the composer rather than a flat grey.
                      backgroundColor: '#FFE8DA',
                      borderWidth: 1,
                      borderColor: 'rgba(246,118,115,0.30)',
                    }}
                  >
                    <Text style={{ color: colors.brandCoral, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 }}>
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

              <View className="border-t border-neutral-100 py-4">
                <View className="mb-2 flex-row items-center">
                  <Ionicons name="calendar-outline" size={20} color="#242424" />
                  <Text className="ml-3 text-[16px] text-[#242424]">{t.plaza.event_title}</Text>
                </View>
                <EventDateTimeField value={eventTime} onChange={setEventTime} />
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

              {/* Only a post with no picture gets a drawn cover, so only a
                  post with no picture is asked about one. The preview is the
                  real component at a real width — a thumbnail of a cover whose
                  whole point is its typography would be a picture of the
                  wrong thing. */}
              {mediaItems.length === 0 && !videoDraft ? (
                <View className="border-t border-neutral-100 py-4">
                  <View className="flex-row">
                    <View className="flex-1 pr-3">
                      <CoverTemplatePicker
                        template={coverTemplate}
                        paletteIndex={coverPaletteIndex}
                        onChange={(next, index) => {
                          setCoverTemplate(next);
                          setCoverPaletteIndex(index);
                        }}
                      />
                    </View>
                    <View
                      style={{ width: 118, borderRadius: 12, overflow: 'hidden' }}
                      testID="plaza.cover-preview"
                    >
                      <PostCover post={composerPreviewPost} width={118} />
                    </View>
                  </View>
                </View>
              ) : null}

              <View className="border-t border-neutral-100 py-4">
                <View className="mb-2 flex-row items-center">
                  <Ionicons name="settings-outline" size={20} color="#242424" />
                  <Text className="ml-3 text-[16px] text-[#242424]">{t.plaza.composer_advanced_row}</Text>
                </View>
                <View className="min-h-[44px] flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-[15px] text-[#242424]">{t.plaza.ai_summary_toggle}</Text>
                    <Text className="mt-0.5 text-[13px] leading-5 text-neutral-500">
                      {composerContentTooShort
                        ? t.plaza.ai_summary_too_short_hint
                        : t.plaza.ai_summary_toggle_desc}
                    </Text>
                  </View>
                  <Switch
                    value={aiSummaryEnabled}
                    onValueChange={setAiSummaryEnabled}
                    accessibilityRole="switch"
                    accessibilityLabel={t.plaza.ai_summary_toggle}
                    accessibilityState={{ checked: aiSummaryEnabled }}
                    trackColor={{ false: '#E5E7EB', true: '#FFC9B3' }}
                    thumbColor={aiSummaryEnabled ? colors.brandCoral : '#FFFFFF'}
                  />
                </View>
                <Text className="mt-2 text-sm leading-6 text-neutral-500">{composerHint}</Text>
              </View>

              <View className="border-t border-neutral-100 py-4">
                <Text className="text-sm text-neutral-400">{t.plaza.composer_content_statement}</Text>
              </View>
            </ScrollView>

            <View
              className="absolute bottom-0 left-0 right-0 border-t border-neutral-100 bg-white px-5 pt-4"
              style={{ paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom + 10, 20) }}
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
                  ref={publishTargetRef}
                  collapsable={false}
                  style={{
                    height: 54,
                    flex: 1.9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 27,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 200, 175, 0.65)',
                    backgroundColor: '#F67673',
                    opacity: isSubmitting || isUploadingMedia || !canSubmit ? 0.45 : 1,
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
                    testID="plaza.composer.publish"
                    onPress={() => {
                      // Final walkthrough step: the guide never publishes by
                      // itself — it swaps in an explicit confirm sheet first.
                      if (guide.shouldInterceptPublish) {
                        guide.requestPublishConfirm();
                        return;
                      }
                      handleSubmit(onSubmit, onInvalid)();
                    }}
                    disabled={isSubmitting || isUploadingMedia || !canSubmit}
                    accessibilityRole="button"
                    accessibilityLabel={editingPost ? t.common.save : t.plaza.publish_note}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
          {/* Composer-layer spotlight: RN Modal is its own native window, so
              the walkthrough overlay must live inside it. */}
          <GuideSpotlight
            layer="composer"
            onContinueFromPublish={finishGuideFromPublishStep}
            onConfirmPublish={submitFromGuideConfirm}
          />
        </View>
        )}
      </Modal>

      <CommunityPostDetailModal
        post={selectedPost}
        visible={Boolean(selectedPost)}
        origin={detailOrigin}
        onClose={() => setSelectedPost(null)}
        onEditPost={openComposerForEdit}
      />
    </SafeAreaView>
    </AppBackground>
  );
}
