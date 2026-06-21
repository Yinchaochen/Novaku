import { Image as ExpoImage } from 'expo-image';
import { Image as RNImage, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useLanguage } from '../context/LanguageContext';
import { profileDeepLink } from '../lib/displayId';
import { resolveMediaUrl } from '../lib/media';

const WIDTH = 360;
const HEIGHT = 640; // 9:16 so the same card also works as an Instagram Story

function CityPill({ text }: { text: string }) {
  return (
    <View
      style={{
        marginHorizontal: 4,
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#FFF1F0',
      }}
    >
      <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '600', color: '#F67673' }}>
        {text}
      </Text>
    </View>
  );
}

// Off-screen branded name card captured to PNG (react-native-view-shot) and
// shared to any platform. The QR encodes the profile deep link so a recipient
// can scan straight to this profile.
export function ProfileShareCard({
  userId,
  displayId,
  displayName,
  avatarUrl,
  baseCity,
  originCity,
}: {
  userId: string;
  displayId: string;
  displayName: string;
  avatarUrl?: string | null;
  baseCity?: string | null;
  originCity?: string | null;
}) {
  const { t } = useLanguage();
  const avatar = resolveMediaUrl(avatarUrl);
  const deepLink = profileDeepLink(userId);

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
      <View
        style={{
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: 28,
          overflow: 'hidden',
          alignItems: 'center',
          paddingHorizontal: 22,
          paddingVertical: 30,
        }}
      >
        {avatar ? (
          <ExpoImage source={avatar} style={{ width: 84, height: 84, borderRadius: 42 }} contentFit="cover" />
        ) : (
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 42,
              backgroundColor: '#FFE8DA',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#F67673', fontWeight: '700', fontSize: 32 }}>
              {displayName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}

        <Text numberOfLines={1} style={{ marginTop: 16, fontSize: 22, fontWeight: '800', color: '#1F2937' }}>
          {displayName}
        </Text>

        {baseCity || originCity ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            {baseCity ? <CityPill text={`${t.profile.base_in_label} ${baseCity}`} /> : null}
            {originCity ? <CityPill text={`${t.profile.from_label} ${originCity}`} /> : null}
          </View>
        ) : null}

        <View
          style={{
            marginTop: 24,
            padding: 14,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#F1F1F1',
            backgroundColor: '#FFFFFF',
          }}
        >
          <QRCode value={deepLink} size={188} backgroundColor="#FFFFFF" color="#111111" />
        </View>

        <Text style={{ marginTop: 14, fontSize: 13, color: '#9CA3AF' }}>
          {t.profile.user_id_label}: {displayId}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18 }}>
          <View style={{ width: 26, height: 26, borderRadius: 8, overflow: 'hidden' }}>
            <RNImage source={require('../assets/icon.png')} resizeMode="cover" style={{ width: 26, height: 26 }} />
          </View>
          <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: '800', color: '#F67673' }}>Postervia</Text>
        </View>
      </View>
    </View>
  );
}
