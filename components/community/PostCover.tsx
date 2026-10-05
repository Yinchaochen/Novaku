import { Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { CoverSticker } from './CoverSticker';
import {
  BrushMark,
  CoverGround,
  DoodleLayer,
  PhraseLabel,
  RansomTitle,
  ScribbleMark,
  Scrap,
  SpiralHoles,
  Splashes,
  StampsStrip,
  Tab,
} from './coverPackParts';
import { useLanguage } from '../../context/LanguageContext';
import { COVER_FACES, faceText } from '../../lib/coverFonts';
import { coverPlan, estimateEm, readingMinutes, type CoverLayout, type CoverPalette } from '../../lib/postCover';
import { displayFontFor } from '../../lib/displayFont';
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

/** Scripts that stack: Han, kana, Hangul. Vertical setting is for these. */
const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;

/** The sentence cut into columns of `perColumn` glyphs, first column first. */
function columnsOf(text: string, perColumn: number): string[] {
  const glyphs = Array.from(text.replace(/\s+/g, ''));
  const out: string[] = [];
  for (let i = 0; i < glyphs.length; i += perColumn) {
    out.push(glyphs.slice(i, i + perColumn).join('\n'));
  }
  return out;
}

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

  /**
   * The card carries two levels now, and that is the whole answer to why it
   * looked empty (2026-09-15, lisum: 这个新的 design 还是很丑).
   *
   * Their long-post cards are 标题 + 摘要 — the title set large across three or
   * four lines and the summary set small filling the rest of the card. I
   * confirmed it in their own release notes: 一键排版 generates 封面配图 and
   * 文章摘要, and the composer lets the author edit 标题 and 摘要 separately.
   * Ours printed one lifted sentence in the top third and left the rest of the
   * card blank, which is not a quieter version of their card — it is a card
   * with nothing on most of it.
   *
   * So the title is the hero and the lifted sentence becomes the summary under
   * it. The sentence keeps its highlighter, because that mark is ours and it
   * reads better on prose than on a headline.
   *
   * D-135 rule 2 said the cover must never restate the title, since the feed
   * prints the title 10dp below the card. Theirs prints it under the card too
   * and repeats it anyway, and looking at both walls the repetition costs far
   * less than the emptiness did.
   */
  const pack = plan.pack;
  const face = plan.face ? COVER_FACES[plan.face] : null;
  const seed = post.id.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const titleText = faceText(plan.face, (post.translated_title ?? post.title ?? '').trim());
  const titleEm = estimateEm(titleText);
  // Sized to FIT four lines rather than banded into four sizes. The bands put
  // a 24em title on a rung that holds 22 and every other card in the wall
  // ended in an ellipsis — which lisum saw before I did. A line at ratio r
  // holds about 0.52/r em once wrapping slack is paid, so four of them hold
  // 2.08/r; 1.85 is that with the slack the estimate itself can be wrong by.
  const titleRatio = Math.max(0.052, Math.min(0.112, titleEm > 0 ? 1.85 / titleEm : 0.112));
  // A pack's hand face sets larger or smaller than the system face at the
  // same size; `scale` is that correction, measured in the prototype.
  const titleSize = width * titleRatio * (face?.scale ?? 1);
  // The summary is the same size a body page sets at, so a cover and the
  // pages behind it are one object at two densities rather than two designs.
  const size = width * Math.min(plan.sizeRatio, 0.052);
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

  // 札记集尘 only works on a script that stacks: a German sentence turned on
  // its side is not vertical typesetting, it is a sentence that fell over. A
  // cover is drawn in the READER's language, so the family cannot promise the
  // layout -- it falls back to the plate, which is its nearest relative.
  const canStack = CJK_RE.test(plan.keyLine);
  // A poster anchors its words to the bottom edge, and a long title pushed
  // the first line off the top; past ~18 em the card is set as a page instead.
  const layout: CoverLayout =
    plan.layout === 'vertical' && !canStack
      ? 'plate'
      : plan.layout === 'poster' && titleEm > 18
        ? 'journal'
        : plan.layout;
  const centred = layout === 'plate' || layout === 'rules';
  const onPage = layout === 'zine' || layout === 'journalpage';

  // Room left under the title, in lines of the summary's own size.
  const excerptLines = 6;

  const titleStyle = {
    fontSize: titleSize,
    lineHeight: titleSize * (face?.lead ?? (onPage ? 1.12 : 1.22)),
    // Set in the pack's face when it covers every glyph, else in the display
    // face when that does, else the system stack — never a mixture (D-148).
    fontFamily: face ? face.family : displayFontFor(titleText),
    fontWeight: face ? face.weight : displayFontFor(titleText) ? ('400' as const) : ('800' as const),
    letterSpacing: face?.track ? face.track * titleSize : titleSize > 18 ? -0.4 : 0,
    color: palette.ink,
    textAlign: centred ? ('center' as const) : ('left' as const),
  };

  // Cut-out letters past ~60 glyphs are a wall of scraps, not a title.
  const ransom = Boolean(pack?.decor?.includes('ransom')) && onPage && Array.from(titleText).length <= 60;
  const titleBlock = !titleText ? null : ransom ? (
    <View style={{ marginBottom: plan.isBlank ? 0 : 0.5 * u }}>
      <RansomTitle title={titleText} size={titleSize * 0.9} seed={seed} width={width} />
    </View>
  ) : plan.highlightStyle === 'block' ? (
    // The candy pack: the title ON a block of its own colour.
    <View style={{ alignItems: centred ? 'center' : 'flex-start', marginBottom: plan.isBlank ? 0 : 0.6 * u }}>
      <View style={{ paddingHorizontal: 0.7 * u, paddingVertical: 0.4 * u, borderRadius: u * 0.28, backgroundColor: palette.wash }}>
        <Text numberOfLines={4} style={titleStyle}>
          {titleText}
        </Text>
      </View>
    </View>
  ) : (
    <View
      style={{
        marginBottom: plan.isBlank ? 0 : 0.7 * u,
        transform: onPage ? [{ rotate: layout === 'zine' ? '-3deg' : '-1.2deg' }] : undefined,
      }}
    >
      <Text numberOfLines={4} style={titleStyle}>
        {titleText}
      </Text>
    </View>
  );

  // On a journal page the sentence is in the page's own hand, a size up and
  // looser, the way the prototype set it; elsewhere it stays the body face.
  const labelFace = onPage && plan.labelFace ? COVER_FACES[plan.labelFace] : null;
  const bodyType = labelFace
    ? {
        ...type,
        fontFamily: labelFace.family,
        fontWeight: labelFace.weight,
        fontSize: size * 1.12 * labelFace.scale,
        lineHeight: size * 1.12 * labelFace.scale * 1.4,
        letterSpacing: 0,
      }
    : type;
  const markOnLabel = plan.highlightStyle === 'tape' || plan.highlightStyle === 'sticky';
  // The colour a stroke-style mark is painted in: the crayon pack marks with
  // its accent beneath the words; everything else paints with the wash.
  const markColour = pack?.highlightOn === 'accent' ? palette.accent : palette.wash;

  const keyLineBlock = plan.isBlank ? null : (
    <>
      <Text
        numberOfLines={plan.highlight ? Math.max(1, (onPage ? 4 : excerptLines) - 1) : onPage ? 4 : excerptLines}
        style={[bodyType, centred ? { textAlign: 'center' as const } : null]}
      >
        {plan.highlight ? plan.highlight.before.trimEnd() : plan.keyLine}
      </Text>

      {/* The rule. `wash` has been in every palette since the cover shipped
          and was never drawn. It was a band behind the glyphs first, which is
          all a nested run can paint: square, and the full height of the line.
          The phrase gets a block of its own instead, and the block shrinks to
          its own text, so the rule underneath is the width of the words and
          nothing else. The packs draw the same block under a brush stroke, a
          scribble, or move the phrase onto a label (D-164). */}
      {plan.highlight && markOnLabel ? (
        <View style={{ marginTop: 0.8 * u, marginLeft: layout === 'journalpage' ? 0.4 * u : 0.3 * u }}>
          <PhraseLabel
            text={plan.highlight.span}
            kind={plan.highlightStyle === 'sticky' ? 'sticky' : 'tape'}
            face={plan.labelFace}
            size={size}
            palette={palette}
            u={u}
            rotate={layout === 'zine' ? -2 : 2}
          />
        </View>
      ) : plan.highlight ? (
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
            {plan.highlightStyle === 'brush' ? (
              <BrushMark height={rule * 1.6} colour={markColour} />
            ) : plan.highlightStyle === 'scribble' ? (
              <ScribbleMark height={rule * 1.5} colour={markColour} />
            ) : (
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
            )}
            <Text numberOfLines={1} style={bodyType}>
              {plan.highlight.span}
            </Text>
          </View>
          {plan.highlight.after ? <Text style={bodyType}>{plan.highlight.after}</Text> : null}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={{ width: '100%', aspectRatio: 1, backgroundColor: palette.paper, overflow: 'hidden' }}>
      {/* Pitch u, dot 0.9dp. That is ~9% of the pitch, which is where Rhodia
          and Leuchtturm put it. The packs' other grounds live next to it. */}
      <CoverGround ground={plan.ground} u={u} palette={palette} grain={pack?.decor?.includes('grain')} />

      {/* The margin rule belongs to the journal page and to nothing else: a
          masthead has its band, a poster has its field, a plate has its two
          hairlines. Held at a third alpha because a 1dp rule at full
          strength beside 13dp type reads as a border. A sketchbook page draws
          its school-notebook red rule at the same place. */}
      {layout === 'journal' || layout === 'journalpage' ? (
        <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
          <Line
            x1={(layout === 'journalpage' ? 1.3 : MARGIN_LEFT - 0.8) * u}
            y1={0}
            x2={(layout === 'journalpage' ? 1.3 : MARGIN_LEFT - 0.8) * u}
            y2={18 * u}
            stroke={palette.accent}
            strokeWidth={layout === 'journalpage' ? 1.5 : 1}
            strokeOpacity={layout === 'journalpage' ? 0.6 : 0.34}
          />
        </Svg>
      ) : null}

      {/* What else lies on a sketchbook page, under the words. */}
      {pack?.decor?.includes('spiral') ? <SpiralHoles u={u} paper={palette.paper} /> : null}
      {pack?.decor?.includes('splash') ? <Splashes u={u} /> : null}
      {pack?.decor?.includes('scrap') ? <Scrap u={u} /> : null}

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

      {/* 黑白极简: one hairline above the words and nothing else at all. The
          family's whole claim is that a page needs one rule and one size of
          type; anything added here would be arguing with it. */}
      {layout === 'mono' ? (
        <View
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            top: MARGIN_TOP * u,
            width: MEASURE * u,
            height: 1,
            backgroundColor: palette.secondary,
            opacity: 0.45,
          }}
        />
      ) : null}

      {/* 杂志先锋: the heavy rule the bracketed section mark used to sit under.
          The mark went with the rubric — lisum, 2026-09-15: 封面只展示内容，
          不要加任何标签. A rule is not a label; it is a piece of the page. */}
      {layout === 'magazine' ? (
        <View
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            top: MARGIN_TOP * u,
            width: MEASURE * u,
            height: Math.max(2, u * 0.14),
            backgroundColor: palette.accent,
          }}
        />
      ) : null}

      {/* What the post costs to read, opposite its kind. The cheapest honest
          thing on the card: the reader learns what they are committing to
          before they commit. Silent under three minutes. */}
      {minutes > 0 ? (
        <Text
          numberOfLines={1}
          style={{
            position: 'absolute',
            right: (18 - MARGIN_LEFT - 1) * u,
            top: MARGIN_TOP * u,
            fontSize: rubricSize,
            fontWeight: '700',
            letterSpacing: rubricSize * 0.04,
            color: palette.secondary,
          }}
        >
          {t.plaza.cover_reading_time.replace('{minutes}', String(minutes))}
        </Text>
      ) : null}

      {layout === 'vertical' ? (
        // 札记集尘. RN has no vertical writing mode, so the columns are built
        // rather than declared: the glyphs are split into fixed runs and each
        // run is set one per line, laid out right to left. That is also how
        // the script is actually read, which is why it survives being faked.
        <View
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            right: MARGIN_LEFT * u,
            top: 3.4 * u,
            bottom: 1.6 * u,
            flexDirection: 'row-reverse',
            justifyContent: 'flex-start',
          }}
        >
          {columnsOf(plan.keyLine, Math.max(4, Math.floor((13 * u) / (size * 1.12)))).map(
            (column, index) => (
              <Text
                key={index}
                style={{
                  fontSize: size,
                  lineHeight: size * 1.12,
                  fontWeight: '700',
                  color: palette.ink,
                  marginLeft: index === 0 ? 0 : size * 0.55,
                  textAlign: 'center',
                }}
              >
                {column}
              </Text>
            ),
          )}
        </View>
      ) : layout === 'rules' ? (
        // 逻辑结构: two rules flanking the sentence. They are the family, so
        // they are drawn at full strength and nothing else is coloured.
        <View
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            top: 0,
            bottom: 0,
            width: MEASURE * u,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View style={{ width: Math.max(2, u * 0.2), alignSelf: 'stretch', marginVertical: 4.4 * u, backgroundColor: palette.accent }} />
          <View style={{ flex: 1, paddingHorizontal: 0.7 * u }}>
            {titleBlock}
            {keyLineBlock}
          </View>
          <View style={{ width: Math.max(2, u * 0.2), alignSelf: 'stretch', marginVertical: 4.4 * u, backgroundColor: palette.accent }} />
        </View>
      ) : layout === 'blocks' ? (
        // 拼接色块: the sentence sits ON a block of colour rather than under a
        // highlighter. The block shrink-wraps the words, so a short sentence
        // gets a small block and a long one a large -- which is the pattern
        // their cards make down a column.
        <View
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            top: 4 * u,
            width: MEASURE * u,
            alignItems: 'flex-start',
          }}
        >
          {pack ? (
            // A pack's block carries the title, and the sentence runs below it
            // in the open (the prototype's reading of their 拼接色块).
            <>
              <View
                style={{
                  paddingHorizontal: 0.7 * u,
                  paddingVertical: 0.5 * u,
                  borderRadius: u * 0.28,
                  backgroundColor: pack.highlightOn === 'accent' ? palette.accent : palette.wash,
                  marginBottom: 0.6 * u,
                }}
              >
                <Text
                  numberOfLines={4}
                  style={[titleStyle, pack.highlightOn === 'accent' ? { color: palette.paper } : null]}
                >
                  {titleText}
                </Text>
              </View>
              {keyLineBlock}
            </>
          ) : (
            <View
              style={{
                paddingHorizontal: 0.7 * u,
                paddingVertical: 0.5 * u,
                borderRadius: u * 0.28,
                backgroundColor: palette.wash,
              }}
            >
              {keyLineBlock}
            </View>
          )}
        </View>
      ) : layout === 'mono' ? (
        <View
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            top: MARGIN_TOP * u + rubricSize * 3.4,
            width: MEASURE * u,
          }}
        >
          {titleBlock}
          {keyLineBlock}
        </View>
      ) : layout === 'magazine' ? (
        <View
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            top: MARGIN_TOP * u + rubricSize * 3.6,
            width: MEASURE * u,
          }}
        >
          {titleBlock}
          {keyLineBlock}
        </View>
      ) : layout === 'plate' ? (
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
          {titleBlock}
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
      ) : layout === 'zine' ? (
        // The mixtape sheet: a tilted title high on the field, the sentence
        // in the label hand, the phrase on a torn label below.
        <View style={{ position: 'absolute', left: 1.4 * u, top: 1.9 * u, width: 15.2 * u }}>
          {titleBlock}
          {keyLineBlock}
        </View>
      ) : layout === 'journalpage' ? (
        // A page of a journal: inside the red margin rule, in the page's hand.
        <View style={{ position: 'absolute', left: 2.4 * u, top: 1.6 * u, width: 14.4 * u }}>
          {titleBlock}
          {keyLineBlock}
        </View>
      ) : (
        <View
          style={{
            position: 'absolute',
            left: MARGIN_LEFT * u,
            width: MEASURE * u,
            ...(layout === 'poster' ? { bottom: 2.2 * u } : { top: 3.4 * u }),
          }}
        >
          {titleBlock}
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
      {plan.stickerStyle === 'emoji' && plan.sticker && (layout === 'journal' || layout === 'poster') ? (
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

      {/* The packs' drawn stickers (D-164): our geometry, in the pack's own
          render, on the same margins the stamp used. The plate and the rules
          still do without one, for the same reason as before. */}
      {pack && plan.stickerStyle !== 'emoji' && !centred
        ? plan.stickers.map((s, i) => {
            const boost = s.second ? 1 : (pack.stickerBoost ?? 1);
            const sizePx = s.sizeU * boost * u;
            const position = s.second
              ? layout === 'poster'
                ? { left: 1.1 * u, top: 1.0 * u }
                : onPage
                  ? { left: 0.7 * u, bottom: 0.6 * u }
                  : { left: 0.9 * u, bottom: 0.9 * u }
              : layout === 'poster'
                ? { right: 1.2 * u, top: 1.0 * u }
                : layout === 'zine'
                  ? { right: -0.3 * u, bottom: 1.6 * u }
                  : layout === 'journalpage'
                    ? { right: 0.8 * u, bottom: 0.7 * u }
                    : { right: 1.0 * u, bottom: 0.6 * u };
            return (
              <View key={i} pointerEvents="none" style={{ position: 'absolute', ...position }}>
                <CoverSticker
                  id={s.id}
                  size={sizePx}
                  mode={plan.stickerStyle === 'emoji' ? 'puffy' : plan.stickerStyle}
                  ink={palette.ink}
                  halo={(pack.halo ?? 0) * 24}
                  second={palette.accent}
                  rotate={s.rot}
                />
              </View>
            );
          })
        : null}

      {pack?.decor?.includes('stamps') ? <StampsStrip u={u} palette={palette} /> : null}
      {pack?.decor?.includes('tab') ? <Tab u={u} /> : null}
      {pack && plan.doodles.length > 0 ? (
        <DoodleLayer doodles={plan.doodles} u={u} ink={palette.ink} opacity={pack.doodles?.opacity ?? 0.9} />
      ) : null}
    </View>
  );
}
