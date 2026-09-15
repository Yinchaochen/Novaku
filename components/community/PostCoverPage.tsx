import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import { coverPlan } from '../../lib/postCover';
import { BODY_LEADING, bodyPageSizeRatio, type CoverBodyPage } from '../../lib/coverPages';
import type { CommunityPost } from '../../features/community/useCommunity';

/**
 * One page of a post's body, drawn on the same stationery as its cover (D-142).
 *
 * The cover sets one lifted sentence enormous; this sets prose. Same stock,
 * same dot field, same margin rule, same corner — a reader swiping from the
 * cover into the body must land on the next page of one object, not on a
 * different design that happens to share a colour.
 *
 * The page number sits in the outer margin, small, in the rubric ink. That is
 * the one piece of furniture a page of a book has that a cover does not, and
 * it is what tells a reader mid-swipe where they are without a progress bar.
 *
 * NOTHING HERE SETS fontFamily, for the reason PostCover gives at length: the
 * brand face carries 721 codepoints and roughly 38 of our 106 locales would
 * render as tofu.
 */

const MARGIN_LEFT = 2;
const MARGIN_TOP = 3;
const MARGIN_RIGHT = 4;
const MEASURE = 18 - MARGIN_LEFT - MARGIN_RIGHT;

export function PostCoverPage({
  post,
  page,
  width,
  pageNumber,
  pageCount,
}: {
  post: CommunityPost;
  page: CoverBodyPage;
  width: number;
  pageNumber: number;
  pageCount: number;
}) {
  const plan = coverPlan(
    post,
    post.translated_title ?? post.title,
    post.translated_body ?? post.body,
  );
  const palette = plan.palette;
  const u = width / 18;
  const size = width * bodyPageSizeRatio(post.cover_template);
  const folioSize = Math.max(9, u * 0.58);

  return (
    <View style={{ width: '100%', aspectRatio: 1, backgroundColor: palette.paper }}>
      <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
        {plan.ground === 'dotted' ? (
          <>
            <Defs>
              <Pattern id="page-dots" width={u} height={u} patternUnits="userSpaceOnUse">
                <Circle cx={u / 2} cy={u / 2} r={0.45} fill={palette.dot} />
              </Pattern>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#page-dots)" />
          </>
        ) : null}
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

      <View
        style={{
          position: 'absolute',
          left: MARGIN_LEFT * u,
          top: MARGIN_TOP * u,
          width: MEASURE * u,
        }}
      >
        {page.paragraphs.map((paragraph, index) => (
          <Text
            key={index}
            style={{
              fontSize: size,
              lineHeight: size * BODY_LEADING,
              color: palette.ink,
              marginTop: index === 0 ? 0 : size * 0.8,
            }}
          >
            {paragraph}
          </Text>
        ))}
      </View>

      <Text
        style={{
          position: 'absolute',
          left: MARGIN_LEFT * u,
          bottom: 1.4 * u,
          fontSize: folioSize,
          fontWeight: '700',
          letterSpacing: folioSize * 0.08,
          color: palette.secondary,
          fontVariant: ['tabular-nums'],
        }}
      >
        {`${pageNumber} / ${pageCount}`}
      </Text>
    </View>
  );
}
