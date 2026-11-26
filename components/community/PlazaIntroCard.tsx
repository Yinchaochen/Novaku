import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect } from 'react';
import { Pressable, Text, View, type TextStyle } from 'react-native';

import { useLanguage } from '../../context/LanguageContext';
import { useCoverFaceReady } from '../../hooks/useCoverFaceReady';
import {
  PLAZA_INTRO_ASPECT,
  PLAZA_INTRO_CUE_KEYS,
  plazaIntroCue,
  plazaIntroLineFace,
} from '../../lib/plazaIntro';
import { colors } from '../../theme/tokens';
import { PaperSticker } from '../PaperSticker';

const VIDEO = require('../../assets/video/plaza-intro.mp4');

// A highlighter stroke behind the changing line. A background on a nested Text
// follows the line breaks on iOS, Android and the web; a coloured underline does
// not (Android draws it in the text colour).
const HIGHLIGHT = 'rgba(246, 118, 115, 0.30)';

/**
 * The intro video at the top of the Plaza (user feedback 2026-11-26: people did
 * not see what the app is for). The headline stays for the whole loop; the line
 * under it follows the video. Plays muted, only while it is on screen.
 */
export function PlazaIntroCard({ width, active, onHide }: { width: number; active: boolean; onHide: () => void }) {
  const { t, langCode } = useLanguage();
  const player = useVideoPlayer(VIDEO, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.timeUpdateEventInterval = 0.2;
  });
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const { muted } = useEvent(player, 'mutedChange', { muted: true });

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  const lines = PLAZA_INTRO_CUE_KEYS.map((key) => t.plaza_intro[key]);
  const face = plazaIntroLineFace(langCode, lines);
  const kuaileReady = useCoverFaceReady(face === 'kuaile' ? 'kuaile' : null);
  const lineFont: TextStyle =
    face === 'kalam'
      ? { fontFamily: 'Kalam_700Bold', fontSize: 18, lineHeight: 26 }
      : face === 'kuaile' && kuaileReady
        ? { fontFamily: 'ZCOOLKuaiLe_Cover', fontSize: 18, lineHeight: 26 }
        : { fontSize: 16, lineHeight: 24, fontWeight: '400' };
  const current = plazaIntroCue(currentTime);

  return (
    <View testID="plaza.intro" style={{ width, alignSelf: 'center', marginTop: 10, marginBottom: 16 }}>
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_800ExtraBold',
          fontSize: 18,
          fontWeight: '800',
          lineHeight: 22,
          letterSpacing: -0.3,
          color: colors.textMain,
        }}
      >
        {t.plaza_intro.headline}
      </Text>
      {/* Every line is laid out in the same place and only the current one shows,
          so the block keeps the height of the longest line and the feed below
          does not jump each time the video moves on. */}
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {PLAZA_INTRO_CUE_KEYS.map((key) => {
          const shown = key === current;
          return (
            <View
              key={key}
              style={{ width: '100%', marginRight: '-100%', opacity: shown ? 1 : 0 }}
              accessibilityElementsHidden={!shown}
              importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
            >
              <Text style={[{ color: colors.textMain }, lineFont]} testID={shown ? 'plaza.intro.line' : undefined}>
                <Text style={{ backgroundColor: HIGHLIGHT }}>{t.plaza_intro[key]}</Text>
              </Text>
            </View>
          );
        })}
      </View>
      <View
        style={{
          marginTop: 10,
          aspectRatio: PLAZA_INTRO_ASPECT,
          borderRadius: 14,
          borderWidth: 1.6,
          borderColor: colors.textMain,
          backgroundColor: colors.bgCream,
          overflow: 'hidden',
        }}
      >
        <VideoView
          player={player}
          // On the web this style lands on a <video>, which needs the size spelled out.
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
        <Pressable
          testID="plaza.intro.sound"
          accessibilityRole="button"
          accessibilityLabel={muted ? t.plaza_intro.sound_on : t.plaza_intro.sound_off}
          onPress={() => {
            player.muted = !muted;
            if (!muted) return;
            player.play();
          }}
          hitSlop={8}
          style={{ position: 'absolute', left: 8, bottom: 8 }}
        >
          <PaperSticker width={32} height={32}>
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={16} color={colors.textMain} />
          </PaperSticker>
        </Pressable>
        <Pressable
          testID="plaza.intro.hide"
          accessibilityRole="button"
          accessibilityLabel={t.plaza_intro.hide}
          onPress={() => {
            player.pause();
            onHide();
          }}
          hitSlop={10}
          style={{ position: 'absolute', right: 8, top: 8 }}
        >
          <PaperSticker width={28} height={28}>
            <Ionicons name="close" size={15} color={colors.textMain} />
          </PaperSticker>
        </Pressable>
      </View>
    </View>
  );
}
