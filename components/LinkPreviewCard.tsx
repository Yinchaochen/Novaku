import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { useLinkPreview } from '../features/linkPreview/useLinkPreview';
import { openExternalUrl } from '../lib/links';

interface Props {
  url: string;
  isMe?: boolean;
}

export function LinkPreviewCard({ url, isMe = false }: Props) {
  const { data } = useLinkPreview(url);
  if (!data || (!data.title && !data.description && !data.image_url)) {
    return null;
  }
  return (
    <Pressable
      onPress={() => void openExternalUrl(url)}
      style={{
        marginBottom: 6,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: isMe ? 'rgba(255,255,255,0.18)' : '#F3F4F6',
      }}
    >
      {/* Privacy (DECISIONS D-032): image loads directly from the 3rd-party host, exposing the user's IP. Known GDPR-audit tradeoff; mitigation = backend image proxy. */}
      {data.image_url ? (
        <Image source={data.image_url} style={{ width: '100%', height: 120 }} contentFit="cover" />
      ) : null}
      <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
        {data.site_name ? (
          <Text numberOfLines={1} style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.75)' : '#6B7280' }}>
            {data.site_name}
          </Text>
        ) : null}
        {data.title ? (
          <Text
            numberOfLines={2}
            style={{ fontSize: 13, fontWeight: '700', color: isMe ? '#FFFFFF' : '#1F2937', marginTop: 1 }}
          >
            {data.title}
          </Text>
        ) : null}
        {data.description ? (
          <Text
            numberOfLines={2}
            style={{ fontSize: 12, color: isMe ? 'rgba(255,255,255,0.85)' : '#4B5563', marginTop: 2 }}
          >
            {data.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
