import { useId, type ReactNode } from 'react';
import { Image } from 'expo-image';
import { Text, View, type TextStyle } from 'react-native';

import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  Path,
  Pattern,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { CoverSticker } from './CoverSticker';
import { COVER_FACES, faceText, type CoverFace } from '../../lib/coverFonts';
import type { CoverCutout } from '../../lib/coverCutouts';
import { COLLAGE_SLIP, type CoverDoodle, type CoverGround, type CoverPalette } from '../../lib/postCover';

/**
 * A prefix that makes this svg root's defs its own. Ids live in one document
 * on web, so `url(#grid)` in the fortieth card resolved to the first card's
 * pattern: every stamp card drew the journal stock's pale green grid, bright
 * on the black stock (2026-10-05, dev gallery). Native scopes defs per root
 * and is unaffected either way.
 */
function svgScope(): string {
  return useId().replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * The parts of a cover pack that are not words (D-164): the ground the page
 * is printed on, the marks a hand makes on it, and what else is lying on it.
 * Every measurement is in u = W/18, like the cover itself.
 */

/* ---- grounds ---------------------------------------------------------------- */

/** Our own marker shapes, tone on tone, for the mixtape field. */
const MOTIF_PATHS: [string, number, number, number, number][] = [
  ['M128 30 L154 98 L226 102 L170 148 L190 220 L128 180 L66 220 L86 148 L30 102 L102 98 Z', 20, 24, 0.22, -12],
  ['M128 214 L50 134 Q22 100 48 70 Q80 42 112 70 L128 88 L144 70 Q176 42 208 70 Q234 100 206 134 Z', 150, 60, 0.18, 20],
  ['M128 30 Q138 118 226 128 Q138 138 128 226 Q118 138 30 128 Q118 118 128 30 Z', 60, 150, 0.2, 8],
  ['M40 184 Q70 60 196 86 M160 60 L198 86 L172 124', 170, 170, 0.19, -25],
];

export function CoverGround({
  ground,
  u,
  palette,
  grain,
}: {
  ground: CoverGround;
  u: number;
  palette: CoverPalette;
  /** The crayon and sketch papers carry a tooth: a faint ink speckle over everything. */
  grain?: boolean;
}) {
  const uid = svgScope();
  const W = 18 * u;
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
      <Defs>
        <Pattern id={`${uid}dots`} width={u} height={u} patternUnits="userSpaceOnUse">
          <Circle cx={u / 2} cy={u / 2} r={0.45} fill={palette.dot} />
        </Pattern>
        <Pattern id={`${uid}grid`} width={u} height={u} patternUnits="userSpaceOnUse">
          <Line x1={0} y1={0.5} x2={u} y2={0.5} stroke={palette.dot} strokeWidth={1} />
          <Line x1={0.5} y1={0} x2={0.5} y2={u} stroke={palette.dot} strokeWidth={1} />
        </Pattern>
        <Pattern id={`${uid}ruled`} width={u} height={1.4 * u} patternUnits="userSpaceOnUse">
          <Line x1={0} y1={1.4 * u - 0.5} x2={u} y2={1.4 * u - 0.5} stroke={palette.dot} strokeWidth={1} />
        </Pattern>
        <Pattern id={`${uid}grain`} width={6} height={6} patternUnits="userSpaceOnUse">
          <Circle cx={1.5} cy={2} r={0.55} fill={palette.ink} opacity={0.11} />
          <Circle cx={4.5} cy={5} r={0.45} fill={palette.ink} opacity={0.08} />
        </Pattern>
        <Pattern id={`${uid}motif`} width={7 * u} height={7 * u} patternUnits="userSpaceOnUse" viewBox="0 0 240 240">
          {MOTIF_PATHS.map(([d, x, y, s, r], i) => (
            <Path
              key={i}
              d={d}
              fill="none"
              stroke={palette.dot}
              strokeWidth={22}
              strokeLinecap="round"
              strokeLinejoin="round"
              transform={`translate(${x} ${y}) scale(${s}) rotate(${r} 128 128)`}
            />
          ))}
        </Pattern>
        <RadialGradient id={`${uid}tone`} cx="50%" cy="42%" rx="60%" ry="52%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${uid}age1`} cx="18%" cy="88%" rx="32%" ry="26%">
          <Stop offset="0" stopColor="#785A28" stopOpacity={0.1} />
          <Stop offset="1" stopColor="#785A28" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${uid}age2`} cx="84%" cy="14%" rx="28%" ry="24%">
          <Stop offset="0" stopColor="#785A28" stopOpacity={0.08} />
          <Stop offset="1" stopColor="#785A28" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {ground === 'dotted' ? <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${uid}dots)`} /> : null}
      {ground === 'grid' ? <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${uid}grid)`} /> : null}
      {ground === 'ruled' ? (
        <>
          <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${uid}ruled)`} />
          <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${uid}age1)`} />
          <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${uid}age2)`} />
        </>
      ) : null}
      {ground === 'motif' ? <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${uid}motif)`} /> : null}
      {ground === 'toned' ? <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${uid}tone)`} /> : null}
      {ground === 'crumpled' ? (
        // The creases of a sheet that was folded and flattened: a few long
        // faint lines, as the prototype drew them with gradients.
        <>
          {[
            [0.02 * W, 0.78 * W, 0.62 * W, -0.05 * W],
            [-0.05 * W, 0.3 * W, 1.05 * W, 0.9 * W],
            [0.55 * W, 1.05 * W, 0.9 * W, -0.04 * W],
            [-0.02 * W, 0.52 * W, 0.46 * W, 1.04 * W],
          ].map(([x1, y1, x2, y2], i) => (
            <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={palette.ink} strokeWidth={1} opacity={0.055} />
          ))}
          <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${uid}age1)`} />
        </>
      ) : null}
      {grain ? <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${uid}grain)`} /> : null}
    </Svg>
  );
}

/* ---- the marks under a phrase -------------------------------------------------- */

/**
 * A brush stroke under the words: thick in the middle, thinning at both ends.
 * Stretches to whatever width the phrase takes (a 100 x 10 box scaled without
 * keeping its aspect), so it needs no measurement of the text.
 */
export function BrushMark({ height, colour }: { height: number; colour: string }) {
  return (
    <Svg
      width="100%"
      height={height}
      style={{ position: 'absolute', left: 0, bottom: 0 }}
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
    >
      <Path
        d="M0 5.5 Q 25 0.5 50 3.5 T 100 4.5 Q 75 9.8 50 7.5 T 0 5.5 Z"
        fill={colour}
        opacity={0.6}
      />
    </Svg>
  );
}

/** A marker scribbled back and forth under the words. */
export function ScribbleMark({ height, colour }: { height: number; colour: string }) {
  const points: string[] = [];
  for (let i = 0; i <= 12; i += 1) {
    points.push(`${(100 / 12) * i},${i % 2 === 0 ? 2 : 8.5}`);
  }
  return (
    <Svg
      width="100%"
      height={height}
      style={{ position: 'absolute', left: 0, bottom: 0 }}
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
    >
      <Path
        d={`M${points.join(' L')}`}
        fill="none"
        stroke={colour}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.72}
      />
    </Svg>
  );
}

/**
 * The phrase on a strip of tape or a sticky note, in its own ink and face,
 * tilted a degree or two, held down by a piece of translucent tape.
 */
export function PhraseLabel({
  text,
  kind,
  face,
  size,
  palette,
  u,
  rotate,
}: {
  text: string;
  kind: 'tape' | 'sticky';
  face: CoverFace | null;
  size: number;
  palette: CoverPalette;
  u: number;
  rotate: number;
}) {
  const spec = face ? COVER_FACES[face] : null;
  const fontSize = size * (spec?.scale ?? 1) * (kind === 'sticky' ? 1.0 : 1.05);
  return (
    <View style={{ alignSelf: 'flex-start', transform: [{ rotate: `${rotate}deg` }] }}>
      <View
        style={{
          backgroundColor: palette.wash,
          paddingVertical: kind === 'sticky' ? 0.45 * u : 0.3 * u,
          paddingHorizontal: kind === 'sticky' ? 0.7 * u : 1.0 * u,
          borderRadius: kind === 'sticky' ? 1 : 2,
          shadowColor: '#000000',
          shadowOpacity: 0.16,
          shadowRadius: 2,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
      >
        <Text
          numberOfLines={2}
          style={{
            fontSize,
            lineHeight: fontSize * 1.25,
            color: palette.washInk ?? palette.ink,
            fontFamily: spec?.family,
            // The weight is in the file; Android draws Roboto for any other (see CoverFaceSpec.weight).
            fontWeight: spec ? 'normal' : '700',
            letterSpacing: spec?.track ? spec.track * fontSize : 0,
          }}
        >
          {faceText(face, text)}
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          top: -0.45 * u,
          left: -0.5 * u,
          width: 2.4 * u,
          height: 0.9 * u,
          backgroundColor: 'rgba(255,255,255,0.55)',
          transform: [{ rotate: '-9deg' }],
        }}
      />
    </View>
  );
}

/* ---- what else is on the page ------------------------------------------------ */

/** The coil of a spiral-bound notebook along the left edge. */
export function SpiralHoles({ u, paper }: { u: number; paper: string }) {
  const n = 10;
  const pitch = (18 * u) / n;
  return (
    <Svg width={1.4 * u} height="100%" style={{ position: 'absolute', left: 0, top: 0 }}>
      {Array.from({ length: n }, (_, i) => (
        <Circle
          key={i}
          cx={0.7 * u}
          cy={pitch * (i + 0.5)}
          r={0.26 * u}
          fill={paper}
          stroke="#2A2A2A"
          strokeWidth={0.16 * u}
        />
      ))}
    </Svg>
  );
}

/** Two watercolour splashes, one pink top right and one cyan bottom left. */
export function Splashes({ u }: { u: number }) {
  const uid = svgScope();
  const W = 18 * u;
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
      <Defs>
        <RadialGradient id={`${uid}splashPink`} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#F7A6C9" stopOpacity={0.55} />
          <Stop offset="0.6" stopColor="#F7A6C9" stopOpacity={0.28} />
          <Stop offset="1" stopColor="#F7A6C9" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${uid}splashCyan`} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#19E3FF" stopOpacity={0.38} />
          <Stop offset="0.6" stopColor="#19E3FF" stopOpacity={0.18} />
          <Stop offset="1" stopColor="#19E3FF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={W + 2 * u} cy={2 * u} rx={3.6 * u} ry={3 * u} fill={`url(#${uid}splashPink)`} />
      <Ellipse cx={4 * u} cy={W + 1.3 * u} rx={3 * u} ry={2.5 * u} fill={`url(#${uid}splashCyan)`} />
    </Svg>
  );
}

/** A torn scrap of coloured paper at the left edge. */
export function Scrap({ u }: { u: number }) {
  const w = 1.9 * u;
  const h = 7 * u;
  const pts = [[0, 0], [1, 0.04], [0.92, 0.18], [1, 0.33], [0.9, 0.5], [1, 0.66], [0.94, 0.82], [1, 1], [0, 1]]
    .map(([x, y]) => `${x * w},${y * h}`)
    .join(' ');
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', left: -0.4 * u, top: 5.5 * u }}>
      <Polygon points={pts} fill="#2E3A6B" opacity={0.92} />
    </Svg>
  );
}

/** A yellow index tab peeking over the top edge. */
export function Tab({ u }: { u: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: -0.15 * u,
        left: 3.2 * u,
        width: 2.3 * u,
        height: 1.1 * u,
        backgroundColor: '#F6D34A',
        borderRadius: 2,
        transform: [{ rotate: '-3deg' }],
        shadowColor: '#000000',
        shadowOpacity: 0.2,
        shadowRadius: 1,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    />
  );
}

/** A strip of three stamps, each a ballpoint drawing inside a perforated frame. */
export function StampsStrip({ u, palette }: { u: number; palette: CoverPalette }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 1.9 * u,
        bottom: 0.7 * u,
        flexDirection: 'row',
        gap: 0.15 * u,
        transform: [{ rotate: '-2deg' }],
      }}
    >
      {['obj-tower', 'obj-tram', 'obj-coffee'].map((id) => (
        <View
          key={id}
          style={{
            width: 2.3 * u,
            height: 2.0 * u,
            backgroundColor: 'rgba(255,255,255,0.4)',
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: palette.secondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CoverSticker id={id} size={1.5 * u} mode="ink" ink={palette.ink} colour="#2B4C9B" />
        </View>
      ))}
    </View>
  );
}

/** The marker doodles around the words. */
export function DoodleLayer({ doodles, u, ink, opacity }: { doodles: CoverDoodle[]; u: number; ink: string; opacity: number }) {
  const W = 18 * u;
  return (
    <>
      {doodles.map((d, i) => {
        const size = d.sizeU * u;
        return (
          <View
            key={i}
            pointerEvents="none"
            style={{ position: 'absolute', left: d.x * W - size / 2, top: d.y * W - size / 2, opacity }}
          >
            <CoverSticker id={d.id} size={size} mode="ink" ink={ink} colour={d.colour} rotate={d.rot} />
          </View>
        );
      })}
    </>
  );
}

/**
 * A title cut out of magazines, one glyph per scrap. Works for any script,
 * which is the point: Chloe's MAX is three letters, a Chinese title is a row
 * of characters, and both read as paste-up.
 */
const RANSOM_SCRAPS: [string, string][] = [
  ['#1A1A1A', '#FFFFFF'],
  ['#FFFFFF', '#1A1A1A'],
  ['#C8102E', '#FFFFFF'],
  ['#F2E7D6', '#1A1A1A'],
  ['#FFFFFF', '#C8102E'],
];

/** The three colours a packet of HELLO-I'M badges comes in; the stock's accent is the one in front. */
const NAMETAG_COLOURS = ['#1F4FD8', '#D5232B', '#1C8A4F'];
const NAMETAG_PAPER = '#F7F3EA';

export function NameTag({
  hello,
  im,
  title,
  titleStyle,
  palette,
  u,
  seed,
}: {
  hello: string;
  im: string;
  title: string;
  titleStyle: TextStyle;
  palette: CoverPalette;
  u: number;
  seed: number;
}) {
  const front = palette.accent;
  const behind = NAMETAG_COLOURS.filter((c) => c.toLowerCase() !== front.toLowerCase()).slice(0, 2);
  const w = 12.6 * u;
  const tilt = ((Math.abs(seed) % 5) - 2) * 0.9;
  const edge = { borderRadius: 0.7 * u, borderWidth: 0.16 * u, borderColor: NAMETAG_PAPER };
  return (
    <View style={{ alignSelf: 'center', width: w, marginTop: 1.3 * u, marginBottom: 1.1 * u }}>
      {/* The two badges behind, in the colours the author did not pick. */}
      <View
        style={[
          edge,
          {
            position: 'absolute', top: -0.6 * u, left: 0.7 * u, width: w, height: '100%',
            backgroundColor: behind[0], transform: [{ rotate: `${tilt + 6}deg` }],
          },
        ]}
      />
      <View
        style={[
          edge,
          {
            position: 'absolute', top: -0.25 * u, left: -0.6 * u, width: w, height: '100%',
            backgroundColor: behind[1], transform: [{ rotate: `${tilt - 4}deg` }],
          },
        ]}
      />
      <View
        style={[
          edge,
          {
            overflow: 'hidden', transform: [{ rotate: `${tilt}deg` }],
            shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2,
          },
        ]}
      >
        <View style={{ backgroundColor: front, alignItems: 'center', paddingTop: 0.5 * u, paddingBottom: 0.3 * u }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 1.7 * u, lineHeight: 1.95 * u, letterSpacing: 0.08 * u }}>
            {hello}
          </Text>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 0.85 * u, lineHeight: 1.05 * u, letterSpacing: 0.05 * u }}>
            {im}
          </Text>
        </View>
        <View style={{ backgroundColor: NAMETAG_PAPER, paddingHorizontal: 0.8 * u, paddingVertical: 0.9 * u, minHeight: 4.6 * u, justifyContent: 'center' }}>
          <Text numberOfLines={4} style={[titleStyle, { textAlign: 'center' }]}>
            {title}
          </Text>
        </View>
        <View style={{ height: 0.9 * u, backgroundColor: front }} />
      </View>
    </View>
  );
}

const RANSOM_FLOWS_PER_GLYPH = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;

export function RansomTitle({
  title,
  size,
  seed,
  width,
}: {
  title: string;
  size: number;
  seed: number;
  /** The cover's width: a word stays whole only when its scraps fit one line. */
  width: number;
}) {
  // Words stay whole where they can: the glyphs of a word are cut from the
  // same page and wrap together. A word longer than the line (a German
  // compound) and a script without spaces flow glyph by glyph, which is how a
  // row of cut-out characters reads anyway. A long title is cut smaller,
  // never cut short.
  const letters = Array.from(title).filter((ch) => !/\s/.test(ch)).length;
  const s = size * Math.max(0.66, Math.min(1, 40 / Math.max(1, letters)));
  // A scrap's pitch is ~0.64 of the size and the page's text column ~0.8 of
  // the cover: eleven scraps of "Registering" span 115 of a 148dp card
  // (measured in the dev gallery, 2026-10-05).
  const perLine = Math.max(4, Math.floor((width * 0.8) / (s * 0.64)));
  const words = title.split(/(\s+)/).filter(Boolean);
  let n = 0;
  const tile = (ch: string, key: string | number) => {
    n += 1;
    const [bg, fg] = RANSOM_SCRAPS[(n * 7 + seed) % RANSOM_SCRAPS.length];
    const tilt = ((n * 13 + seed) % 7) - 3;
    return (
      <View
        key={key}
        style={{
          backgroundColor: bg,
          paddingHorizontal: s * 0.1,
          paddingVertical: s * 0.02,
          marginHorizontal: s * 0.04,
          marginVertical: s * 0.04,
          transform: [{ rotate: `${tilt}deg` }],
        }}
      >
        <Text style={{ fontSize: s * 0.9, lineHeight: s * 1.05, fontWeight: '800', color: fg }}>{ch}</Text>
      </View>
    );
  };
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {words.map((word, w) => {
        if (/^\s+$/.test(word)) return <View key={`s${w}`} style={{ width: s * 0.35 }} />;
        const chars = Array.from(word);
        if (chars.length > perLine || RANSOM_FLOWS_PER_GLYPH.test(word)) {
          return chars.map((ch, i) => tile(ch, `${w}-${i}`));
        }
        return (
          <View key={`w${w}`} style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            {chars.map((ch, i) => tile(ch, i))}
          </View>
        );
      })}
    </View>
  );
}

/* ---- the collage ----------------------------------------------------------- */

type TapeKind = 'stripe' | 'grid' | 'dot';

/** A strip of washi tape: translucent, patterned, a little longer than it needs to be. */
export function WashiTape({
  u,
  colour,
  kind,
  rotate,
  style,
}: {
  u: number;
  colour: string;
  kind: TapeKind;
  rotate: number;
  style: object;
}) {
  const uid = svgScope();
  const step = 0.55 * u;
  return (
    <View
      pointerEvents="none"
      style={[{ position: 'absolute', width: 3.6 * u, height: 1.05 * u, opacity: 0.86, transform: [{ rotate: `${rotate}deg` }] }, style]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={`${uid}tape`} width={step} height={step} patternUnits="userSpaceOnUse">
            {kind === 'stripe' ? (
              <Path d={`M0 ${step} L${step} 0`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={step * 0.28} />
            ) : kind === 'grid' ? (
              <>
                <Line x1={0} y1={0.5} x2={step} y2={0.5} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1} />
                <Line x1={0.5} y1={0} x2={0.5} y2={step} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1} />
              </>
            ) : (
              <Circle cx={step / 2} cy={step / 2} r={step * 0.16} fill="#FFFFFF" fillOpacity={0.7} />
            )}
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={colour} />
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${uid}tape)`} />
      </Svg>
    </View>
  );
}

/** The flat layer: a scrap of ledger paper that only shows where the slip does not cover it. */
function LedgerScrap({ u, rotate, style }: { u: number; rotate: number; style: object }) {
  const rows = Array.from({ length: 7 }, (_, i) => i);
  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 9.4 * u,
          height: 6.2 * u,
          backgroundColor: '#ECE4CF',
          transform: [{ rotate: `${rotate}deg` }],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {rows.map((i) => (
        <View key={i} style={{ position: 'absolute', left: 0, right: 0, top: (0.9 + i * 0.8) * u, height: 1, backgroundColor: '#9DB3CC', opacity: 0.55 }} />
      ))}
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 1.4 * u, width: 1, backgroundColor: '#C4574F', opacity: 0.6 }} />
    </View>
  );
}

/**
 * The collage card (2026-10-05). The tutorial lisum sent has three rules and
 * this is all three: grey, flat material goes underneath and only peeks out;
 * one piece of heavy colour sits on top, top right or bottom left, where the
 * eye lands; nothing is lined up. The words get a cream slip of their own so
 * they read on any ground, and the slip is held by tape, as it would be.
 */
export function CollageScene({
  u,
  palette,
  cutout,
  corner,
  seed,
  children,
}: {
  u: number;
  palette: CoverPalette;
  cutout: CoverCutout;
  corner: 'topRight' | 'bottomLeft';
  seed: number;
  children: ReactNode;
}) {
  const topRight = corner === 'topRight';
  const s = Math.abs(seed | 0);
  // As tall as 10.6u, no wider than 8u, in the plate's own proportion.
  const scale = Math.min((10.6 * u) / cutout.height, (8 * u) / cutout.width);
  const kinds: TapeKind[] = ['stripe', 'grid', 'dot'];
  return (
    <>
      <LedgerScrap
        u={u}
        rotate={topRight ? -6 : 5}
        style={topRight ? { left: 0.4 * u, top: 6.2 * u } : { right: 0.4 * u, top: 0.5 * u }}
      />
      <View
        style={[
          {
            position: 'absolute',
            width: 11.2 * u,
            paddingHorizontal: 0.9 * u,
            paddingTop: 1.0 * u,
            paddingBottom: 0.8 * u,
            backgroundColor: COLLAGE_SLIP,
            transform: [{ rotate: `${topRight ? 1.3 : -1.3}deg` }],
            shadowColor: '#000000',
            shadowOpacity: 0.16,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          },
          // Pushed to the edge opposite the plate, so the plate overlaps the slip's margin and not its words.
          topRight ? { left: 0.8 * u, bottom: 1.3 * u } : { right: 0.6 * u, top: 1.4 * u },
        ]}
      >
        {children}
        <WashiTape u={u} colour={palette.accent} kind={kinds[s % 3]} rotate={-32} style={{ top: -0.45 * u, left: -1.2 * u }} />
        <WashiTape u={u} colour={palette.accent} kind={kinds[(s + 1) % 3]} rotate={28} style={{ top: -0.45 * u, right: -1.2 * u }} />
      </View>
      <Image
        source={cutout.image}
        contentFit="contain"
        accessibilityIgnoresInvertColors
        style={[
          {
            position: 'absolute',
            width: cutout.width * scale,
            height: cutout.height * scale,
            transform: [{ rotate: `${((s % 9) - 4) * 1.4}deg` }],
          },
          topRight ? { right: -0.9 * u, top: 0.4 * u } : { left: -0.9 * u, bottom: 0.3 * u },
        ]}
      />
    </>
  );
}

