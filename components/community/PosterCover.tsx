import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCoverFaceReady } from '../../hooks/useCoverFaceReady';
import { COVER_FACES } from '../../lib/coverFonts';
import {
  fitPosterTitle,
  fitPosterWord,
  POSTER_ASPECT,
  posterLines,
  posterPlan,
  type PosterSpec,
} from '../../lib/posterCover';

/** Lines are measured once at this size; a width in ems holds at every card width. */
const REFERENCE_SIZE = 100;

// Lives outside the component so a recycled cell draws at the right size the first time.
const measuredEms = new Map<string, number>();

/**
 * Three layers, bottom to top: paper and photo, the words, the cut-out subject.
 * The words are the reader's (lib/posterCover.ts), so the subject stands in
 * front of them in every language. They are drawn clean: the halftone on the
 * baked samples is pixels and cannot follow a language.
 */
export function PosterCover({
  spec,
  word,
  title,
  width,
}: {
  spec: PosterSpec;
  /** Both already in the reader's language. */
  word: string;
  title: string;
  width: number;
}) {
  const height = width / POSTER_ASPECT;
  const plan = posterPlan(word, title);
  const wordReady = useCoverFaceReady(plan.wordFace);
  const titleReady = useCoverFaceReady(plan.titleFace);
  const [measurement, redraw] = useState(0);

  const wordFamily = plan.wordFace && wordReady ? COVER_FACES[plan.wordFace].family : undefined;
  const wordWeight = wordFamily ? ('normal' as const) : ('900' as const);
  const keyOf = (line: string) => `${wordFamily ?? 'system'}|${line}`;
  const lines = posterLines(plan);

  const fit = useMemo(
    () =>
      lines.every((line) => measuredEms.has(keyOf(line)))
        ? fitPosterWord(plan.layouts, plan.wordScript, (line) => measuredEms.get(keyOf(line)) ?? 0, spec, width)
        : null,
    // `measurement` stands in for the map: it ticks on every report.
    [plan.word, wordFamily, spec, width, measurement],
  );

  const wordBox = spec.word_box;
  const titleBox = spec.title_box;
  const titleFamily = plan.titleFace && titleReady ? COVER_FACES[plan.titleFace].family : null;
  const titleFit = fitPosterTitle(plan, titleFamily, width, titleBox.w * width, titleBox.h * height);

  return (
    <View style={{ width, height, backgroundColor: spec.paper, overflow: 'hidden' }}>
      {spec.base ? (
        <Image testID="poster.base" source={spec.base} contentFit="fill" style={StyleSheet.absoluteFill} />
      ) : null}

      <View testID="poster.word-box" style={StyleSheet.absoluteFill}>
        {fit?.lines.map((line, index) => (
          <Text
            key={line}
            testID="poster.word"
            allowFontScaling={false}
            numberOfLines={1}
            style={{
              position: 'absolute',
              left: wordBox.x * width,
              width: wordBox.w * width,
              top: fit.centres[index] - fit.lineBox / 2 - fit.drop,
              fontSize: fit.size,
              lineHeight: fit.lineBox,
              fontFamily: wordFamily,
              fontWeight: wordWeight,
              color: spec.ink,
              textAlign: 'center',
              includeFontPadding: false,
            }}
          >
            {line}
          </Text>
        ))}
      </View>

      {plan.title ? (
        <View
          testID="poster.title-box"
          style={{
            position: 'absolute',
            left: titleBox.x * width,
            top: titleBox.y * height,
            width: titleBox.w * width,
            height: titleBox.h * height,
          }}
        >
          <Text
            testID="poster.title"
            allowFontScaling={false}
            numberOfLines={titleFit.maxLines}
            style={{
              fontSize: titleFit.size,
              lineHeight: titleFit.size * plan.titleLead,
              letterSpacing: plan.titleTrack * titleFit.size,
              fontFamily: titleFamily ?? undefined,
              fontWeight: titleFamily ? 'normal' : '800',
              color: spec.title_ink,
              textAlign: plan.rtl ? 'right' : 'left',
              writingDirection: plan.rtl ? 'rtl' : 'ltr',
            }}
          >
            {plan.title}
          </Text>
        </View>
      ) : null}

      {spec.subject ? (
        <Image testID="poster.subject" source={spec.subject} contentFit="fill" style={StyleSheet.absoluteFill} />
      ) : null}

      {/* Stays mounted: on web a font counts as loaded before its file lands, and
          the width that matters is the one reported after it swaps in. */}
      <View pointerEvents="none" style={styles.measuring}>
        {lines.map((line) => (
          <Text
            key={line}
            testID="poster.measure"
            allowFontScaling={false}
            numberOfLines={1}
            style={{ alignSelf: 'flex-start', fontSize: REFERENCE_SIZE, fontFamily: wordFamily, fontWeight: wordWeight }}
            onLayout={(event) => {
              const ems = event.nativeEvent.layout.width / REFERENCE_SIZE;
              if (ems <= 0) return;
              measuredEms.set(keyOf(line), ems);
              // Always: another card may have measured this line first, and this one still has to draw.
              redraw((n) => n + 1);
            }}
          >
            {line}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  measuring: { position: 'absolute', left: 0, top: 0, width: 20000, opacity: 0 },
});
