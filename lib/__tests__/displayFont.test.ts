/**
 * The rule that keeps the display face from making tofu (D-148).
 *
 * PostCover's prohibition on setting a fontFamily was never about taste: the
 * brand face has 721 codepoints and a missing glyph raises nothing, so the
 * failure mode is a locale silently rendering as boxes. The prohibition is
 * conditional now, and this file is the condition.
 */

import { canUseDisplayFont, displayFontFor, DISPLAY_FONT_FAMILY } from '../displayFont';

describe('canUseDisplayFont', () => {
  it('takes German, which is what most of our covers are', () => {
    expect(canUseDisplayFont('Anmeldung beim Bürgeramt — Straße 87')).toBe(true);
  });

  it('takes ordinary Chinese', () => {
    expect(canUseDisplayFont('柏林租房合同里的押金条款')).toBe(true);
  });

  it('takes a title that mixes the two', () => {
    expect(canUseDisplayFont('柏林 Anmeldung 攻略（2026）')).toBe(true);
  });

  it('refuses scripts the subset does not carry, rather than boxing them', () => {
    expect(canUseDisplayFont('Регистрация в Берлине')).toBe(false); // Cyrillic
    expect(canUseDisplayFont('การลงทะเบียน')).toBe(false); // Thai
    expect(canUseDisplayFont('التسجيل في برلين')).toBe(false); // Arabic
    expect(canUseDisplayFont('베를린 등록')).toBe(false); // Hangul
    expect(canUseDisplayFont('ベルリンの住民登録')).toBe(false); // kana
  });

  it('refuses a whole string for one character out of coverage', () => {
    // Never a mixture: a headline with three glyphs in a different typeface is
    // worse than a headline in the system stack.
    expect(canUseDisplayFont('Berlin')).toBe(true);
    expect(canUseDisplayFont('Berlin Ω')).toBe(false);
  });

  it('does not count whitespace, which has no glyph to miss', () => {
    expect(canUseDisplayFont('two words\nand a line break')).toBe(true);
  });

  it('refuses an empty string rather than setting a face on nothing', () => {
    expect(canUseDisplayFont('')).toBe(false);
  });

  it('hands back a family name or undefined, never an empty string', () => {
    expect(displayFontFor('Berlin')).toBe(DISPLAY_FONT_FAMILY);
    expect(displayFontFor('Берлин')).toBeUndefined();
  });
});
