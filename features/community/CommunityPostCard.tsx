import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { CommunityPost } from './useCommunity';

interface Props {
  post: CommunityPost;
  onPress?: (post: CommunityPost) => void;
}

function getVisualHeight(post: CommunityPost) {
  const seed = post.id.charCodeAt(0) % 3;
  if (post.media_items.length > 0) {
    return seed === 0 ? 220 : seed === 1 ? 276 : 244;
  }
  return seed === 0 ? 150 : seed === 1 ? 190 : 170;
}

function getTypeColor(postType: CommunityPost['post_type']) {
  switch (postType) {
    case 'guide':
      return { bg: '#FFF4D6', fg: '#C78300' };
    case 'warning':
      return { bg: '#FFE7E8', fg: '#D63A4A' };
    case 'question':
      return { bg: '#E9F4FF', fg: '#2B6CB0' };
    case 'recommendation':
      return { bg: '#FFE9EE', fg: '#FF2442' };
    default:
      return { bg: '#F0ECFF', fg: '#6F42C1' };
  }
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <Image
        source={avatarUrl}
        contentFit="cover"
        style={{ width: 20, height: 20, borderRadius: 10 }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: 20, height: 20, backgroundColor: '#FFE6EA' }}
    >
      <Text style={{ color: '#FF2442', fontSize: 10, fontWeight: '700' }}>
        {name.trim().slice(0, 1).toUpperCase() || 'N'}
      </Text>
    </View>
  );
}

export function CommunityPostCard({ post, onPress }: Props) {
  const { t } = useLanguage();
  const typeColor = getTypeColor(post.post_type);
  const imageHeight = getVisualHeight(post);

  return (
    <Pressable
      className="mb-3 overflow-hidden rounded-[22px] bg-white"
      style={{
        shadowColor: '#000000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      }}
      onPress={() => onPress?.(post)}
    >
      {post.media_items[0] ? (
        <Image
          source={post.media_items[0].media_url}
          contentFit="cover"
          transition={120}
          style={{ width: '100%', height: imageHeight }}
        />
      ) : (
        <View
          className="justify-end px-4 pb-4 pt-5"
          style={{ height: imageHeight, backgroundColor: typeColor.bg }}
        >
          <View className="mb-3 self-start rounded-full bg-white/80 px-3 py-1">
            <Text style={{ color: typeColor.fg, fontSize: 11, fontWeight: '700' }}>
              {t.plaza[`type_${post.post_type}`]}
            </Text>
          </View>
          <Text numberOfLines={4} style={{ color: '#111111', fontSize: 16, fontWeight: '700', lineHeight: 22 }}>
            {post.body}
          </Text>
        </View>
      )}

      <View className="px-3 pb-3 pt-3">
        <Text numberOfLines={2} className="mb-2 text-[15px] font-semibold leading-5 text-black">
          {post.title}
        </Text>

        <View className="flex-row items-center justify-between">
          <View className="mr-2 flex-1 flex-row items-center">
            <Avatar name={post.author.display_name} avatarUrl={post.author.avatar_url} />
            <Text numberOfLines={1} className="ml-2 flex-1 text-xs text-neutral-500">
              {post.author.display_name}
            </Text>
          </View>

          <View className="ml-2 flex-row items-center">
            <Ionicons
              name={post.viewer_marked_helpful ? 'heart' : 'heart-outline'}
              size={15}
              color={post.viewer_marked_helpful ? '#FF2442' : '#6B7280'}
            />
            <Text className="ml-1 text-xs text-neutral-500">{post.helpful_count}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
