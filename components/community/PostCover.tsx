import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import { useLanguage } from '../../context/LanguageContext';
import { coverPlan, readingMinutes, type CoverPalette } from '../../lib/postCover';
import type { CommunityPost } from '../../features/community/useCommunity';

/**
 * The cover a text-only post gets instead of a picture.
 *
 * A post with no photo used to be a tinted square with the opening of its body
 * poured in and cut off mid-sentence. Xiaohongshu gives text posts a designed
 * cover — and because a text note there costs the same vertical budget as a
 * photo note, a feed of them still reads as a feed rather than as a list of
 * things that failed to have an image.
 *
 * The page is a notebook page: tinted stock, a dot field, a margin rule, a
 * rubric across the top, and one sentence lifted out of the body and set
 * large. Every measurement is an integer multiple of u = W/18,
 * because 18 is the lowest common multiple of the ninths and sixths the Van de
 * Graaf canon divides a page into — which is what lets the margins be
 * canonical and land on whole units at the same time.
 *
 * NOTHING HERE SETS fontFamily, AND NOTHING HERE MAY. Plus Jakarta Sans is the
 * brand face and it carries 721 codepoints — Latin, Latin Extended, Vietnamese,
 * and no more. I parsed the cmap of the shipped .ttf: U+0410 (Cyrillic А),
 * U+0391 (Greek Α), U+67CF (柏), U+0627 (Arabic alef) and U+0E01 (Thai ko kai)
 * are all absent. Attaching it here would look like a brand improvement and
 * would silently replace the text of roughly 38 of the app's 106 locales with
 * tofu. The system stack — PingFang SC on iOS, Noto Sans CJK on Android — has
 * every script, which is the whole reason this cover can be multilingual at
 * all. Weight and size carry the hierarchy instead.
 *
 * Drawn on the client rather than rendered to an image on the server, and that
 * is not a convenience. A seeded guide is stored in one language and
 * translated per reader at request time, so a baked cover would be frozen in
 * the source language and sit above a title in the reader's own — worse than
 * the flat panel it replaced. Pillow on the server cannot draw Chinese,
 * Japanese, Korean, Thai or any Indic script at all (matplotlib's DejaVu has
 * no glyphs for them, verified by rendering 柏 and getting a bitmap identical
 * to a guaranteed-missing codepoint), and its wheel ships without libraqm, so
 * Arabic and Hebrew come out unshaped. The client already has every one of
 * those scripts for free.
 */

/** The canon: 1/9 top and inner, 2/9 outer and bottom, on an 18-unit grid. */
const MARGIN_LEFT = 2;
const MARGIN_TOP = 2;
const MARGIN_RIGHT = 4;
const MEASURE = 18 - MARGIN_LEFT - MARGIN_RIGHT;

/** The rule under the phrase, as fractions of the type size. */
const RULE_HEIGHT = 0.58;
/** How far above the baseline the rule reaches, cutting into the glyphs.
 *  Half the leading and the descender are below the baseline; both are added,
 *  not subtracted — a rule that clears the descenders is a rule under the
 *  text, and the highlighter this imitates runs through it. */
const OVERLAP = 0.46;
/** How far below the baseline the font descends. True enough of every system
 *  face the app lands on to place a rule; nothing here is precise about it. */
const DESCENDER = 0.21;

export function PostCover({
  post,
  width,
  paletteOverride,
}: {
  post: CommunityPost;
  width: number;
  /** Dev gallery only: compare stocks side by side without ten fake posts. */
  paletteOverride?: CoverPalette;
}) {
  const { t } = useLanguage();
  const plan = coverPlan(
    post,
    post.translated_title ?? post.title,
    post.translated_body ?? post.body,
  );
  const palette = paletteOverride ?? plan.palette;
  const minutes = readingMinutes(post.translated_body ?? post.body);

  const u = width / 18;
  const size = width * plan.sizeRatio;
  const rubricSize = Math.max(9.5, u * 0.62);
  const rule = Math.max(3, size * RULE_HEIGHT);
  const type = {
    fontSize: size,
    lineHeight: size * plan.leading,
    fontWeight: '700' as const,
    // Tracking runs inversely with size. Getting the direction wrong is the
    // most reliable tell of type that was set by a machine.
    letterSpacing: size > 18 ? -0.4 : 0,
    color: palette.ink,
  };

  const layout = plan.layout;
  const centred = layout === 'plate';
  /** The band a masthead wears, and the height the words then start below. */
  const bandHeight = 3.4 * u;

  const keyLineBlock = plan.isBlank ? null : (
    <>
      <Text
        numberOfLines={plan.highlight ? Math.max(1, plan.maxLines - 1) : plan.maxLines}
        style={[type, centred ? { textAlign: 'center' as const } : null]}
      >
        {plan.highlight ? plan.highlight.before.trimEnd() : plan.keyLine}
      </Text>

      {/* The rule. `wash` has been in every palette since the cover shipped
          and was never drawn. It was a band behind the glyphs first, which is
          all a nested run can paint: square, and the full height of the line.
          The phrase gets a block of its own instead, and the block shrinks to
          its own text, so the rule underneath is the width of the words and
          nothing else. */}
      {plan.highlight ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: centred ? 'center' : 'flex-start',
          }}
        >
          <View style={{ flexShrink: 1 }}>
            {/* Declared before the text, so it paints beneath it: the rule
                rides up over the baseline and the glyphs stay on top of it,
                which is a highlighter and not a strikethrough. Absolute so it
                contributes no height. */}
            <View
              style={{
                position: 'absolute',
                left: -size * 0.04,
                right: -size * 0.04,
                bottom: (size * (plan.leading - 1)) / 2 + size * (DESCENDER + OVERLAP) - rule,
                height: rule,
                borderRadius: rule / 2,
                backgroundColor: palette.wash,
              }}
            />
            <Text numberOfLines={1} style={type}>
              {plan.highlight.span}
            </Text>
          </View>
          {plan.highlight.after ? <Text style={type}>{plan.highlight.after}</Text> : null}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={{ width: '100%', aspectRatio: 1, backgroundColor: palette.paper }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        {plan.ground === 'dotted' ? (
          <>
            <Defs>
              {/* Pitch u, dot 0.9dp. That is ~9% of the pitch, which is where
                  Rhodia and Leuchtturm put it. */}
              <Pattern id="dots" width={u} height={u} patternUnits="userSpaceOnUse">
                <Circle cx={u / 2} cy={u / 2} r={0.45} fill={palette.dot} />
              </Pattern>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#dots)" />
          </>
        ) : null}

        {/* The margin rule belongs to the journal page and to nothing else: a
            masthead has its band, a poster has its field, a plate has its two
            hairlines. Held at a third alpha because a 1dp rule at full
            strength beside 13dp type reads as a border. */}
        {layout === 'journal' ? (
          <Line
            x1={(MARGIN_LEFT - 0.8) * u}
            y1={0}
            x2={(MARGIN_LEFT - 0.8) * u}
            y2={18 * u}
            stroke={palette.accent}
            strokeWidth={1}
            strokeOpacity={0.34}
          />
        ) : null}
      </Svg>

      {/* The band is the masthead's whole graphic, which is why that layout
          draws no watermark: two large marks on one small card is two things
          asking to be looked at first. */}
      {layout === 'masthead' ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: bandHeight,
            backgroundColor: palette.wash,
          }}
        />
      ) : null}

      {/* The watermark, in `palette.dot` — the ground colour, already
          specified as the one tone visible as texture and gone as noise. The
          first attempt used the sticker emoji at a tenth opacity, and a faded
          picture of a banknote is not a grey mark: it keeps its own hue and
          sits behind the words arguing with them.

          On a journal page it bleeds off the top right, because a mark fully
          inside the frame reads as a second piece of content and a mark
          cropped by the edge reads as stock the page was printed on. */}
      {plan.watermark && layout === 'journal' ? (
        <Text
          style={{
            position: 'absolute',
            right: -1.1 * u,
            top: -1.9 * u,
            fontSize: u * 12,
            lineHeight: u * 12,
            fontWeight: '700',
            color: palette.dot,
          }}
        >
          {plan.watermark}
        </Text>
      ) : null}

      {plan.watermark && layout === 'poster' ? (
        // Not cropped here: on a poster the mark is the field the words sit
        // under, so it is whole, centred and enormous.
        <Text
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0.4 * u,
            textAlign: 'center',
            fontSize: u * 10,
            lineHeight: u * 11,
            fontWeight: '700',
            color: palette.dot,
          }}
        >
          {plan.watermark}
        </Text>
      ) : null}

      {/* Rubric: the kind of post, set as a journal header would be. Reversed
          out of the band on a masthead, centred over the sentence on a plate. */}
      <Text
        numberOfLines={1}
        style={{
          position: 'absolute',
          left: centred ? 0 : MARGIN_LEFT * u,
          right: centred ? 0 : undefined,
          top: layout === 'masthead' ? bandHeight / 2 - rubricSize : MARGIN_TOP * u,
          // 15u, not the 12u measure: nothing else occupies this line, and
          // "RECOMMENDATION" tracked out needs nearly all of it.
          width: centred ? undefined : 15 * u,
          textAlign: centred ? 'center' : 'left',
          fontSize: rubricSize,
          fontWeight: '700',
          letterSpacing: rubricSize * 0.1,
          textTransform: 'uppercase',
          color: layout === 'masthead' ? palette.ink : palette.secondary,
        }}
      >
        {t.plaza[`type_${post.post_type}`]}
      </Text>

      {/* What the post costs to read, opposite its kind. The cheapest honest
          thing on the card: the reader learns what they are committing to
          before they commit. Silent under three minutes. */}
      {minutes > 0 ? (
        <Text
          numberOfLines={1}
          style={{
            position: 'absolute',
            right: (18 - MARGIN_LEFT - 1) * u,
            top: layout === 'masthead' ? bandHeight / 2 - rubricSize : MARGIN_TOP * u,
            fontSize: rubricSize,
            fontWeight: '700',
            letterSpacing: rubricSize * 0.04,
            color: layout === 'masthead' ? palette.ink : palette.secondary,
          }}
        >
          {t.plaza.cover_reading_time.replace('{minutes}', String(minutes))}
        </Text>
      ) : null}

      {plan.isBlank ? null : layout === 'plate' ? (
        // Centred on both axes between two hairlines. The rules are what make
        // it a plate rather than a sentence that happens to be in the middle.
        <View
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            top: 0,
            bottom: 0,
            width: MEASURE * u,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              alignSelf: 'stretch',
              height: 1,
              marginBottom: 1.1 * u,
              backgroundColor: palette.secondary,
              opacity: 0.35,
            }}
          />
          {keyLineBlock}
          <View
            style={{
              alignSelf: 'stretch',
              height: 1,
              marginTop: 1.1 * u,
              backgroundColor: palette.secondary,
              opacity: 0.35,
            }}
          />
        </View>
      ) : (
        <View
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            width: MEASURE * u,
            ...(layout === 'poster'
              ? { bottom: 2.2 * u }
              : { top: layout === 'masthead' ? bandHeight + 1.2 * u : 4 * u }),
          }}
        >
          {keyLineBlock}
        </View>
      )}

      {/* The stamp sits in the bottom margin on purpose: the canon forbids the
          text block borrowing from the margin, and a mark in the margin is the
          one thing a margin has always been for. Set as text, so it comes from
          the reader's own system emoji font and costs no asset.

          The plate does without one. Two rules, a centred rubric and a centred
          sentence are a composition; an emoji in the corner of it is a sticker
          somebody put on a printed card. */}
      {plan.sticker && layout !== 'plate' ? (
        <Text
          style={{
            position: 'absolute',
            right: 1.4 * u,
            // A poster's words are already along the bottom, so its stamp goes
            // up beside the mark instead of underneath the sentence.
            ...(layout === 'poster' ? { top: 1.2 * u } : { bottom: 0.7 * u }),
            fontSize: u * 2.4,
            opacity: 0.92,
          }}
        >
          {plan.sticker}
        </Text>
      ) : null}
    </View>
  );
}
