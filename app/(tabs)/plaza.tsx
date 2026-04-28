import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod/v4';

import { useLanguage } from '../../context/LanguageContext';
import { CommunityPostCard } from '../../features/community/CommunityPostCard';
import { CommunityPostDetailModal } from '../../features/community/CommunityPostDetailModal';
import {
  CommunityPost,
  CommunityPostMedia,
  getCommunitySessionId,
  useCommunityFeed,
  useCreateCommunityPost,
  useTrackCommunityEvents,
  useUploadCommunityMedia,
} from '../../features/community/useCommunity';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  post_type: z.enum(['experience', 'question', 'guide', 'warning', 'recommendation']),
  title: z.string().min(4).max(160),
  body: z.string().min(12).max(4000),
  source_url: z.string().url().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;
type TopTab = 'following' | 'explore' | 'nearby';
type FeedCategory = 'all' | 'experience' | 'guide' | 'question' | 'warning' | 'recommendation';

const POST_TYPES: FormData['post_type'][] = ['experience', 'question', 'guide', 'warning', 'recommendation'];
const MAX_MEDIA_ITEMS = 4;

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

export default function PlazaScreen() {
  const { t } = useLanguage();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, isFetching, refetch } = useCommunityFeed();
  const createPost = useCreateCommunityPost();
  const { mutate: trackCommunityEvents } = useTrackCommunityEvents();
  const uploadMedia = useUploadCommunityMedia();
  const [mediaItems, setMediaItems] = useState<CommunityPostMedia[]>([]);
  const [composerMessage, setComposerMessage] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [activeTopTab, setActiveTopTab] = useState<TopTab>('explore');
  const [activeCategory, setActiveCategory] = useState<FeedCategory>('all');
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
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
    defaultValues: {
      post_type: 'experience',
      title: '',
      body: '',
      source_url: '',
    },
  });

  const selectedType = watch('post_type');

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

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setComposerMessage(t.plaza.photo_permission_denied);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    setIsUploadingMedia(true);
    setComposerMessage(null);
    try {
      const uploaded: CommunityPostMedia[] = [];
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

  const closeComposer = () => {
    setComposerVisible(false);
    setComposerMessage(null);
  };

  const onSubmit = (form: FormData) => {
    setComposerMessage(null);
    createPost.mutate(
      {
        post_type: form.post_type,
        title: form.title,
        body: form.body,
        source_url: form.source_url || undefined,
        city: user?.city,
        identity_scope: user?.identity ?? 'all',
        media_items: mediaItems.map((item) => ({
          media_url: item.media_url,
          mime_type: item.mime_type ?? undefined,
        })),
      },
      {
        onSuccess: (post) => {
          reset({
            post_type: 'experience',
            title: '',
            body: '',
            source_url: '',
          });
          setMediaItems([]);
          setComposerMessage(
            post.moderation_status === 'review' ? t.plaza.review_notice : t.plaza.publish_success
          );
          setComposerVisible(false);
        },
      }
    );
  };

  const topTabs: Array<{ key: TopTab; label: string }> = [
    { key: 'following', label: t.plaza.tab_following },
    { key: 'explore', label: t.plaza.tab_explore },
    { key: 'nearby', label: t.plaza.tab_nearby },
  ];

  const categories: Array<{ key: FeedCategory; label: string }> = [
    { key: 'all', label: t.plaza.category_for_you },
    { key: 'experience', label: t.plaza.type_experience },
    { key: 'guide', label: t.plaza.type_guide },
    { key: 'question', label: t.plaza.type_question },
    { key: 'warning', label: t.plaza.type_warning },
    { key: 'recommendation', label: t.plaza.type_recommendation },
  ];

  const normalizedCity = user?.city?.trim().toLowerCase();

  const filteredPosts = (data ?? []).filter((post) => {
    if (hiddenPostIds.includes(post.id)) {
      return false;
    }
    if (activeTopTab === 'nearby' && normalizedCity && post.city !== normalizedCity) {
      return false;
    }
    if (activeCategory !== 'all' && post.post_type !== activeCategory) {
      return false;
    }
    return true;
  });

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

  const hidePostFromFeed = (postId: string) => {
    setHiddenPostIds((current) => (current.includes(postId) ? current : [...current, postId]));
    setSelectedPost((current) => (current?.id === postId ? null : current));
  };

  return (
    <SafeAreaView className="flex-1" edges={['top']} style={{ backgroundColor: '#FAFAFA' }}>
      <View className="border-b border-neutral-200 bg-white px-4 pb-3 pt-2">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="rounded-full bg-neutral-100 p-2.5">
            <Ionicons name="menu-outline" size={22} color="#111111" />
          </View>

          <View className="flex-row items-center gap-6">
            {topTabs.map((tab) => {
              const active = activeTopTab === tab.key;
              return (
                <Pressable key={tab.key} onPress={() => setActiveTopTab(tab.key)} className="items-center">
                  <Text
                    style={{
                      color: active ? '#111111' : '#A3A3A3',
                      fontSize: 18,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={{
                      marginTop: 8,
                      height: 3,
                      width: 36,
                      borderRadius: 999,
                      backgroundColor: active ? '#FF2442' : 'transparent',
                    }}
                  />
                </Pressable>
              );
            })}
          </View>

          <View className="rounded-full bg-neutral-100 p-2.5">
            <Ionicons name="search-outline" size={22} color="#111111" />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row items-center gap-4">
            {categories.map((category) => {
              const active = activeCategory === category.key;
              return (
                <Pressable key={category.key} onPress={() => setActiveCategory(category.key)}>
                  <Text
                    style={{
                      color: active ? '#111111' : '#A3A3A3',
                      fontSize: 16,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {category.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 10, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor="#FF2442" />
        }
      >
        {isLoading && !data ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#FF2442" />
          </View>
        ) : null}

        {isError ? (
          <Text className="px-4 py-6 text-center text-danger">{t.common.error}</Text>
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
        ) : !isLoading ? (
          <View className="items-center rounded-[28px] bg-white px-6 py-14">
            <Text className="mb-2 text-lg font-semibold text-black">{t.plaza.empty}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        className="absolute self-center rounded-full px-7 py-4"
        style={{
          bottom: Math.max(insets.bottom + 14, 24),
          backgroundColor: '#FF2442',
          shadowColor: '#FF2442',
          shadowOpacity: 0.3,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        }}
        onPress={() => setComposerVisible(true)}
      >
        <View className="flex-row items-center">
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text className="ml-1 text-base font-semibold text-white">{t.plaza.publish_note}</Text>
        </View>
      </Pressable>

      <Modal visible={composerVisible} transparent animationType="slide" onRequestClose={closeComposer}>
        <View className="flex-1 justify-end bg-black/30">
          <View
            className="rounded-t-[30px] bg-white px-5 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom + 18, 32) }}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[20px] font-bold text-black">{t.plaza.composer_title}</Text>
              <Pressable onPress={closeComposer}>
                <Ionicons name="close" size={24} color="#111111" />
              </Pressable>
            </View>
            <Text className="mb-4 text-sm text-neutral-500">{t.plaza.composer_hint}</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
              <View className="mb-4 flex-row flex-wrap gap-2">
                {POST_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    className="rounded-full px-3 py-2"
                    style={{ backgroundColor: selectedType === type ? '#FF2442' : '#F4F4F5' }}
                    onPress={() => setValue('post_type', type, { shouldValidate: true })}
                  >
                    <Text
                      style={{
                        color: selectedType === type ? '#FFFFFF' : '#52525B',
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {t.plaza[`type_${type}`]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="mb-3 rounded-[20px] border border-neutral-200 px-4 py-3 text-base"
                    placeholder={t.plaza.title_placeholder}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {errors.title ? <Text className="mb-2 text-sm text-danger">{errors.title.message}</Text> : null}

              <Controller
                control={control}
                name="body"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="mb-3 min-h-[120px] rounded-[20px] border border-neutral-200 px-4 py-3 text-base"
                    placeholder={t.plaza.body_placeholder}
                    value={value}
                    onChangeText={onChange}
                    multiline
                    textAlignVertical="top"
                  />
                )}
              />
              {errors.body ? <Text className="mb-2 text-sm text-danger">{errors.body.message}</Text> : null}

              <Controller
                control={control}
                name="source_url"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    className="mb-3 rounded-[20px] border border-neutral-200 px-4 py-3 text-base"
                    placeholder={t.plaza.source_placeholder}
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                  />
                )}
              />
              {errors.source_url ? <Text className="mb-2 text-sm text-danger">{errors.source_url.message}</Text> : null}

              <View className="mb-4 rounded-[22px] bg-neutral-50 p-3">
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-black">{t.plaza.photos}</Text>
                  <Pressable
                    className="rounded-full px-3 py-2"
                    style={{ backgroundColor: '#FFF1F3' }}
                    onPress={onPickImages}
                    disabled={isUploadingMedia}
                  >
                    {isUploadingMedia ? (
                      <ActivityIndicator size="small" color="#FF2442" />
                    ) : (
                      <Text style={{ color: '#FF2442', fontSize: 12, fontWeight: '700' }}>
                        {t.plaza.add_photo}
                      </Text>
                    )}
                  </Pressable>
                </View>

                {mediaItems.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-3">
                      {mediaItems.map((item, index) => (
                        <View key={`${item.media_url}-${index}`} className="relative">
                          <Image
                            source={item.media_url}
                            contentFit="cover"
                            transition={120}
                            style={{ width: 110, height: 146, borderRadius: 18 }}
                          />
                          <Pressable
                            className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5"
                            onPress={() => removeMedia(index)}
                          >
                            <Ionicons name="close" size={14} color="#FFFFFF" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <Text className="text-sm text-neutral-400">{t.plaza.photo_empty}</Text>
                )}
              </View>

              {composerMessage ? <Text className="mb-3 text-sm" style={{ color: '#FF2442' }}>{composerMessage}</Text> : null}

              <Pressable
                className="items-center rounded-full py-4"
                style={{ backgroundColor: '#FF2442' }}
                onPress={handleSubmit(onSubmit)}
                disabled={createPost.isPending || isUploadingMedia}
              >
                {createPost.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-base font-semibold text-white">{t.plaza.publish}</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CommunityPostDetailModal
        post={selectedPost}
        visible={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        onHidePost={hidePostFromFeed}
        onReportPost={hidePostFromFeed}
      />
    </SafeAreaView>
  );
}
