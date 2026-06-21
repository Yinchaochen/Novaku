import { Image as ExpoImage } from 'expo-image';
import { Image as RNImage, Text, View } from 'react-native';

import { CommunityPost } from '../features/community/useCommunity';
import { resolveMediaUrl } from '../lib/media';

const WIDTH = 360;
const HEIGHT = 640; // 9:16 for an Instagram Story

function formatDate(value: string, langCode: string) {
  try {
    return new Intl.DateTimeFormat(langCode, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '';
  }
}

// Off-screen branded card captured to PNG (react-native-view-shot) and shared
// as the Instagram Story background. Mirrors the figure-2 layout: first image,
// author, title, date, Postervia branding.
export function StoryShareCard({ post, langCode }: { post: CommunityPost; langCode: string }) {
  const image = post.media_items[0] ? resolveMediaUrl(post.media_items[0].media_url) : null;
  const avatar = resolveMediaUrl(post.author.avatar_url);

  return (
    <View
      style={{
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: '#F67673',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
      }}
    >
      <View style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          {avatar ? (
            <ExpoImage source={avatar} style={{ width: 38, height: 38, borderRadius: 19 }} contentFit="cover" />
          ) : (
            <View
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFE8DA', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#F67673', fontWeight: '700', fontSize: 16 }}>
                {post.author.display_name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>
              {post.author.display_name}
            </Text>
            {post.author.city ? (
              <Text numberOfLines={1} style={{ fontSize: 12, color: '#9CA3AF' }}>
                {post.author.city}
              </Text>
            ) : null}
          </View>
        </View>

        {image ? <ExpoImage source={image} style={{ width: '100%', height: 300 }} contentFit="cover" /> : null}

        <Text
          numberOfLines={3}
          style={{ fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 14, paddingTop: 14, lineHeight: 22 }}
        >
          {post.title}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginTop: 4 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden' }}>
            <RNImage
              source={require('../assets/icon.png')}
              resizeMode="cover"
              style={{ width: 28, height: 28 }}
            />
          </View>
          <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '800', color: '#F67673', flex: 1 }}>Postervia</Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>{formatDate(post.created_at, langCode)}</Text>
        </View>
      </View>
    </View>
  );
}
