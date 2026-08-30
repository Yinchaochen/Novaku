import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import { useLanguage } from '../../context/LanguageContext';
import { coverPlan } from '../../lib/postCover';
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

export function PostCover({ post, width }: { post: CommunityPost; width: number }) {
  const { t } = useLanguage();
  const plan = coverPlan(
    post,
    post.translated_title ?? post.title,
    post.translated_body ?? post.body,
  );
  const { palette } = plan;

  const u = width / 18;
  const size = width * plan.sizeRatio;
  const rubricSize = Math.max(9.5, u * 0.62);

  return (
    <View style={{ width: '100%', aspectRatio: 1, backgroundColor: palette.paper }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        {plan.ground === 'dotted' ? (
          <>
            <Defs>
              {/* Pitch u, dot 0.9dp. That is ~9% of the pitch, which is where
                  Rhodia and Leuchtturm put it — visible as texture, gone as
                  noise, and still a whole pixel on a 2x screen. */}
              <Pattern id="dots" width={u} height={u} patternUnits="userSpaceOnUse">
                <Circle cx={u / 2} cy={u / 2} r={0.45} fill={palette.dot} />
              </Pattern>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#dots)" />
          </>
        ) : null}

        {/* The margin rule — the page's one accent, spent once. Held at a
            third alpha because a 1dp rule at full strength beside 13dp type
            stops reading as ruling and starts reading as a border, which is
            the edge D-088 just finished removing from this card. */}
        <Line
          x1={(MARGIN_LEFT - 0.8) * u}
          y1={0}
          x2={(MARGIN_LEFT - 0.8) * u}
          y2={18 * u}
          stroke={palette.accent}
          strokeWidth={1}
          strokeOpacity={0.34}
        />
      </Svg>

      {/* Rubric. The type of post, set as a journal header would be: small,
          tracked out, in the secondary ink. It replaces the pill the panel
          used to carry, which had become one more rounded object on a screen
          that already had plenty. */}
      <Text
        numberOfLines={1}
        style={{
          position: 'absolute',
          left: MARGIN_LEFT * u,
          top: MARGIN_TOP * u,
          // 15u, not the 12u measure. Nothing else occupies this line, and
          // "RECOMMENDATION" tracked out at a 320dp phone's rubric size needs
          // 98 of the measure's 98.6dp — it was truncating to "RECOMMENDAT…".
          width: 15 * u,
          fontSize: rubricSize,
          fontWeight: '700',
          letterSpacing: rubricSize * 0.1,
          textTransform: 'uppercase',
          color: palette.secondary,
        }}
      >
        {t.plaza[`type_${post.post_type}`]}
      </Text>

      {plan.isBlank ? null : (
        <Text
          numberOfLines={plan.maxLines}
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            top: 4 * u,
            width: MEASURE * u,
            fontSize: size,
            lineHeight: size * plan.leading,
            fontWeight: '700',
            // Tracking runs inversely with size. Getting the direction wrong
            // is the most reliable tell of type that was set by a machine.
            letterSpacing: size > 18 ? -0.4 : 0,
            color: palette.ink,
          }}
        >
          {plan.keyLine}
        </Text>
      )}
    </View>
  );
}
