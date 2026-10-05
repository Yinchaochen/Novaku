import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

import {
  COVER_STICKER_BY_ID,
  STICKER_CANVAS,
  STICKER_INK,
  type StickerElement,
} from '../../lib/coverStickers';
import type { CoverStickerStyle } from '../../lib/postCover';

/**
 * One of our drawn stickers, in the render a pack asks for (D-164).
 *
 * The geometry is shared by every pack — lib/coverStickers.ts, built from the
 * prototype's specimens — and the look is applied here, the way the prototype
 * did it in SVG filters. Filters are not portable across the three renderers
 * this has to work on (iOS, Android, react-native-web), so each look is made
 * of plain shapes drawn more than once:
 *
 *  - `puffy`   the flat fills lisum chose, outlined, set a few pixels above
 *              the paper by a soft shadow underneath. The first puffy attempt
 *              in the prototype lifted the fills toward white and he read it as
 *              over-exposed; the fills stay exactly as drawn.
 *  - `diecut`  the same, with a cream edge cut around the whole shape, the
 *              way a sticker is cut out of its sheet. The edge is the shape
 *              stroked wide in cream and drawn first.
 *  - `ink`     line work only: fills go, strokes take the page's ink. A stamp
 *              on paper, a ballpoint drawing in a margin.
 *  - `crayon`  the ink drawing over a second copy in a second colour, shifted
 *              down-left and left at 60%: the misregistered colour layer of a
 *              crayon print.
 */
export function CoverSticker({
  id,
  size,
  mode,
  ink = STICKER_INK,
  halo = 0,
  second = '#E2AAB2',
  rotate = 0,
  opacity = 1,
  colour,
}: {
  id: string;
  /** Side, in px. */
  size: number;
  mode: Exclude<CoverStickerStyle, 'emoji'>;
  /** The page's ink: outlines, and everything in `ink` mode. */
  ink?: string;
  /** Width of the cream edge in canvas units of the 256 grid (die-cut and puffy only). */
  halo?: number;
  /** The misregistered second colour (crayon only). */
  second?: string;
  rotate?: number;
  opacity?: number;
  /** Ink mode only: draw in this colour instead of the page's ink (a ballpoint doodle). */
  colour?: string;
}) {
  const spec = COVER_STICKER_BY_ID[id];
  if (!spec) return null;
  const lineInk = mode === 'ink' && colour ? colour : ink;

  return (
    <View
      pointerEvents="none"
      style={{ width: size, height: size, opacity, transform: [{ rotate: `${rotate}deg` }] }}
    >
      <Svg width={size} height={size} viewBox={`-24 -24 ${STICKER_CANVAS + 48} ${STICKER_CANVAS + 48}`}>
        {mode === 'puffy' ? (
          // The shadow: the whole shape in ink, dropped 5 units, at 18%.
          <G transform="translate(0 5)" opacity={0.18}>
            {spec.elements.map((el, i) => shape(el, i, { fill: ink, stroke: ink, forceStrokeWidth: 12 }))}
          </G>
        ) : null}
        {(mode === 'diecut' || mode === 'puffy') && halo > 0 ? (
          // The cut edge: every shape stroked wide in cream, under everything.
          <G>
            {spec.elements.map((el, i) =>
              shape(el, i, { fill: '#FFF8F1', stroke: '#FFF8F1', forceStrokeWidth: 12 + halo * 2 }),
            )}
          </G>
        ) : null}
        {mode === 'crayon' ? (
          <G transform="translate(-6 6)" opacity={0.6}>
            {spec.elements.map((el, i) =>
              shape(el, i, { fill: second, stroke: el.sw === 40 || el.sw === 28 ? second : 'none' }),
            )}
          </G>
        ) : null}
        <G>
          {spec.elements.map((el, i) =>
            mode === 'ink'
              ? shape(el, i, {
                  fill: (el.fill ?? 'none').toUpperCase() === STICKER_INK.toUpperCase() ? lineInk : 'none',
                  stroke: el.stroke === 'none' ? 'none' : lineInk,
                })
              : shape(el, i, { strokeDefault: ink }),
          )}
        </G>
      </Svg>
    </View>
  );
}

function shape(
  el: StickerElement,
  key: number,
  override: { fill?: string; stroke?: string; forceStrokeWidth?: number; strokeDefault?: string },
) {
  const fill = override.fill ?? el.fill ?? 'none';
  const stroke = override.stroke ?? el.stroke ?? override.strokeDefault ?? STICKER_INK;
  const strokeWidth = override.forceStrokeWidth ?? el.sw ?? 12;
  const common = {
    fill,
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity: el.opacity,
    transform: el.transform,
  };
  switch (el.t) {
    case 'path':
      return <Path key={key} d={el.d} {...common} />;
    case 'circle':
      return <Circle key={key} cx={el.cx} cy={el.cy} r={el.r} {...common} />;
    case 'ellipse':
      return <Ellipse key={key} cx={el.cx} cy={el.cy} rx={el.rx} ry={el.ry} {...common} />;
    case 'rect':
      return <Rect key={key} x={el.x} y={el.y} width={el.width} height={el.height} rx={el.rx} ry={el.ry} {...common} />;
    case 'polygon':
      return <Polygon key={key} points={el.points} {...common} />;
    case 'polyline':
      return <Polyline key={key} points={el.points} {...common} />;
    case 'line':
      return <Line key={key} x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} {...common} />;
    default:
      return null;
  }
}
