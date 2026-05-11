/**
 * Postervia design tokens — 2026-05 redesign.
 *
 * Single source of truth for color, radius, spacing, shadow, typography.
 * Every component should pull from here instead of hard-coding hex values.
 *
 * Naming follows the brief: warm cream, peach, coral, lavender, brown text,
 * no harsh red / pure black / cold blue / cold gray.
 */

export const colors = {
  // Backgrounds
  bgCream: '#FFF8F1',
  bgWarm: '#FBEDE1',
  bgWarmDeep: '#F8E4D2',

  // Brand
  brandCoral: '#F67673',
  brandPeach: '#FFAA7A',
  brandPeachLight: '#FFC59A',
  brandOrange: '#D79168',
  brandDeep: '#623928',

  // Text
  textMain: '#241A16',
  textBrown: '#3B2A22',
  textMuted: '#81746D',
  textSubtle: '#A89A92',

  // Accents
  lavender: '#A99BFF',
  lavenderSoft: '#C5B4FF',
  goldenCream: '#FFE0A8',
  butter: '#FFE6A7',
  sage: '#CFE3C1',

  // Lines / borders
  lineSoft: 'rgba(98, 57, 40, 0.10)',
  lineSofter: 'rgba(98, 57, 40, 0.06)',
  lineWarm: '#F2DCCB',
  highlight: 'rgba(255, 255, 255, 0.75)',

  // Surfaces
  cardWhite: 'rgba(255, 255, 255, 0.76)',
  cardWhiteSolid: '#FFFFFF',
  cardCream: 'rgba(255, 248, 241, 0.82)',
  cardLavender: 'rgba(244, 238, 255, 0.72)',

  // States
  success: '#8FBC7A',
  successSoft: 'rgba(143, 188, 122, 0.18)',
  danger: '#F47C7C',
  dangerSoft: 'rgba(244, 124, 124, 0.16)',

  // Tab bar
  tabBg: 'rgba(255, 250, 245, 0.82)',
  tabBorder: 'rgba(255, 255, 255, 0.8)',
} as const;

export const gradients = {
  // Primary CTA — coral → peach
  brandCta: ['#FF8F7E', '#FFB072'] as const,
  brandCtaPressed: ['#F5806F', '#F5A368'] as const,

  // Soft surface gradients
  glassWhite: ['rgba(255,255,255,0.86)', 'rgba(255,248,241,0.68)'] as const,
  glassCream: ['rgba(255,250,245,0.88)', 'rgba(251,237,225,0.70)'] as const,
  glassLavender: ['rgba(255,255,255,0.82)', 'rgba(244,238,255,0.72)'] as const,

  // Hero / page header
  heroPeach: ['#FFE8D9', '#FFF8F1', '#FFF1E4'] as const,

  // Hero overlay (over hero image) — softened per user feedback 2026-05-09:
  // 0.55 was too dark, obscured the photo. 0.32 keeps text readable while
  // letting the image breathe.
  heroOverlay: ['rgba(36,26,22,0.10)', 'rgba(36,26,22,0.35)'] as const,

  // Progress bar
  progressFill: ['#FF8F7E', '#FFB072'] as const,

  // Splash — strong brand
  splash: ['#FFF9F2', '#FBE8D8'] as const,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

/**
 * Soft warm shadows — never use cold gray / pure black drop-shadows.
 * On iOS we use shadowColor + shadowOpacity etc, on Android we fall back to
 * elevation. The `card` shadow is the default for any glass / floating card.
 */
export const shadows = {
  card: {
    shadowColor: '#7A4A2C',
    shadowOpacity: 0.10,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  cardLg: {
    shadowColor: '#7A4A2C',
    shadowOpacity: 0.12,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 20 },
    elevation: 10,
  },
  cta: {
    shadowColor: '#F67673',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  ctaPressed: {
    shadowColor: '#F67673',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tab: {
    shadowColor: '#7A4A2C',
    shadowOpacity: 0.10,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  iconButton: {
    shadowColor: '#7A4A2C',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const;

/**
 * Plus Jakarta Sans — Postervia's display font. Modern but humanist, slightly
 * warmer than Inter, fits the "quietly powerful + female-skewing" brand.
 *
 * Loaded by `useFonts` in app/_layout.tsx. Until those fonts finish loading
 * the SplashScreen blocks render, so we can safely reference these names in
 * style objects without a fallback dance.
 *
 * Latin-only — Chinese, Japanese, Korean glyphs gracefully fall back through
 * the system font chain (PingFang SC on iOS, Noto Sans CJK on Android),
 * keeping mixed-script text legible.
 *
 * We attach fontFamily only to display/title/heading levels. Body text stays
 * on system fonts so Chinese-heavy paragraphs render at native quality.
 */
export const fontFamily = {
  display: 'PlusJakartaSans_800ExtraBold',
  displayBold: 'PlusJakartaSans_700Bold',
  semibold: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    lineHeight: 40,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  heading: {
    fontFamily: fontFamily.displayBold,
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  subheading: {
    fontFamily: fontFamily.displayBold,
    fontSize: 17,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
  // SECTION LABEL / OVERLINE — uppercase, spaced
  overline: {
    fontFamily: fontFamily.displayBold,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
} as const;

export const tokens = {
  colors,
  gradients,
  radius,
  spacing,
  shadows,
  typography,
  fontFamily,
} as const;

export default tokens;
