import { COVER_FACES, faceCovers } from '../coverFonts';
import { wrappedLines } from '../postCover';
import {
  fitPosterTitle,
  fitPosterWord,
  hiddenLetters,
  POSTER_ASPECT,
  posterLines,
  posterPlan,
  posterScript,
} from '../posterCover';
import lamp from '../../assets/poster-layers/t26/spec.json';
import tower from '../../assets/poster-layers/t02/spec.json';
import postBox from '../../assets/poster-layers/t01/spec.json';

const WORD_BOX = { x: 0.016, y: 0.245, w: 0.968, h: 0.36 };
const CLEAR = { word_box: WORD_BOX, subject_grid: [] };
const TITLE_BOX = { w: 0.88, h: 0.1585 };
const WIDTHS = [148, 184.5, 240, 490];

/** Wider than any of these strings really sets, so a pass here is not luck. */
const roughEm = (line: string) =>
  Array.from(line).reduce((em, ch) => em + (/[一-鿿]/.test(ch) ? 1.05 : 0.8), 0);

const WORDS = [
  '慢慢来',
  'slow',
  'langsam',
  'على مهلك',
  'ค่อยๆ',
  'take your time',
  'lass dir zeit',
  'Ankunftsbescheinigung',
  'ค่อยเป็นค่อยไป',
  'не спеши',
  'ゆっくり',
  'धीरे धीरे',
  '一',
];

const TITLES = [
  '来德国后，第一个朋友花了多久',
  'How long the first friend took after moving to Germany',
  'Wie lange es bis zum ersten Freund in Deutschland dauerte, und warum das völlig normal ist, auch nach einem Jahr noch',
  'كم من الوقت استغرق أول صديق بعد الانتقال إلى ألمانيا',
  'ย้ายมาเยอรมนีแล้ว กว่าจะมีเพื่อนคนแรกใช้เวลานานแค่ไหน',
];

describe('the word stays in its box', () => {
  it.each(WORDS)('%s, at every card width', (word) => {
    const plan = posterPlan(word, '');
    for (const spec of [CLEAR, lamp, tower, postBox]) {
      for (const width of WIDTHS) {
        const height = width / POSTER_ASPECT;
        const fit = fitPosterWord(plan.layouts, plan.wordScript, roughEm, spec, width);
        expect(fit).not.toBeNull();
        if (!fit) continue;
        expect(Math.max(...fit.lines.map(roughEm)) * fit.size).toBeLessThanOrEqual(WORD_BOX.w * width);
        const ink = fit.size * { square: 1, plain: 0.95, tall: 1.35 }[plan.wordScript];
        expect(fit.centres[0] - ink / 2).toBeGreaterThanOrEqual(WORD_BOX.y * height - ink * 0.15);
        expect(fit.centres[fit.centres.length - 1] + ink / 2).toBeLessThanOrEqual(
          (WORD_BOX.y + WORD_BOX.h) * height + ink * 0.15,
        );
      }
    }
  });

  it('breaks a phrase at a space when that sets it larger, and keeps every word', () => {
    const plan = posterPlan('take your time', '');
    const fit = fitPosterWord(plan.layouts, plan.wordScript, roughEm, CLEAR, 184.5);
    expect(fit?.lines).toHaveLength(2);
    expect(fit?.lines.join(' ')).toBe('TAKE YOUR TIME');
  });

  it('never cuts a word without spaces, it sets it smaller', () => {
    const plan = posterPlan('Ankunftsbescheinigung', '');
    expect(plan.layouts).toEqual([['ANKUNFTSBESCHEINIGUNG']]);
  });

  it('keeps a short word to the height of the box instead of filling the width', () => {
    const plan = posterPlan('一', '');
    const fit = fitPosterWord(plan.layouts, plan.wordScript, () => 1, CLEAR, 184.5);
    expect(fit?.size).toBeCloseTo((WORD_BOX.h * 184.5) / POSTER_ASPECT, 5);
  });

  it('has nothing to fit when there is no word', () => {
    const plan = posterPlan('   ', '');
    expect(plan.layouts).toEqual([]);
    expect(posterLines(plan)).toEqual([]);
    expect(fitPosterWord(plan.layouts, plan.wordScript, roughEm, CLEAR, 184.5)).toBeNull();
  });
});

describe('the subject crosses the word without burying it', () => {
  // Each phrase's width in ems, read off Expo Web at the card sizes below.
  const REAL_EMS: Record<string, number> = {
    "慢慢来": 3.0, "SLOW": 2.9, "LANGSAM": 4.76, "على مهلك": 3.25, "ค่อยๆ": 2.53,
    "别干等": 3.0, "DON'T WAIT": 5.81, "NICHT WARTEN": 7.53, "لا تنتظر": 2.53, "อย่ารอ": 2.98,
    "先别慌": 3.0, "DON'T PANIC": 6.16, "KEINE PANIK": 6.17, "لا تقلق": 2.2, "อย่าเพิ่งตกใจ": 5.98,
  };
  const CASES = [
    { name: 'the lamp', spec: lamp, words: ['慢慢来', 'slow', 'langsam', 'على مهلك', 'ค่อยๆ'] },
    { name: 'the tower', spec: tower, words: ['别干等', "don't wait", 'nicht warten', 'لا تنتظر', 'อย่ารอ'] },
    { name: 'the post box', spec: postBox, words: ['先别慌', "don't panic", 'keine Panik', 'لا تقلق', 'อย่าเพิ่งตกใจ'] },
  ];
  const BODY = { square: 0.92, plain: 0.72, tall: 1 };

  it('counts a tower standing between two assumed letters against the letter behind it', () => {
    // One column in five is solid, on the line between the second and third of four letters.
    const grid = ['0000000000', '0000000000'].map((row) => `${row.slice(0, 4)}99${row.slice(6)}`);
    const proportional = hiddenLetters(grid, 'ABCD', false, 0.5, 0.5, 0.8, 1);
    const square = hiddenLetters(grid, '慢慢来等', true, 0.5, 0.5, 0.8, 1);
    expect(Math.max(...proportional)).toBeGreaterThan(Math.max(...square));
  });

  it.each(CASES)('$name, in five languages', ({ spec, words }) => {
    for (const word of words) {
      const plan = posterPlan(word, '');
      const emOf = (line: string) => REAL_EMS[line] ?? roughEm(line);
      for (const width of [148, 184.5]) {
        const fit = fitPosterWord(plan.layouts, plan.wordScript, emOf, spec, width);
        if (!fit) throw new Error(word);
        const height = width / POSTER_ASPECT;
        const hidden = fit.lines.flatMap((line, index) =>
          hiddenLetters(
            spec.subject_grid,
            line,
            plan.wordScript === 'square',
            0.5,
            fit.centres[index] / height,
            (emOf(line) * fit.size) / width,
            (BODY[plan.wordScript] * fit.size) / height,
          ),
        );
        expect(Math.max(...hidden)).toBeLessThanOrEqual(0.6);
        expect(Math.max(...hidden)).toBeGreaterThanOrEqual(0.05);
      }
    }
  });
});

describe('the title stays above the word', () => {
  it.each(TITLES)('%s', (title) => {
    const plan = posterPlan('', title);
    for (const width of WIDTHS) {
      const boxWidth = TITLE_BOX.w * width;
      const boxHeight = (TITLE_BOX.h * width) / POSTER_ASPECT;
      const family = plan.titleFace ? COVER_FACES[plan.titleFace].family : null;
      const fit = fitPosterTitle(plan, family, width, boxWidth, boxHeight);
      // numberOfLines holds it to maxLines, so this is the tallest it can ever draw.
      expect(fit.maxLines * fit.size * plan.titleLead).toBeLessThanOrEqual(boxHeight);
      expect(fit.size).toBeGreaterThanOrEqual(width * 0.052);
    }
  });

  it('shrinks before it gives up a line', () => {
    const plan = posterPlan('', TITLES[1]);
    const family = plan.titleFace ? COVER_FACES[plan.titleFace].family : null;
    const fit = fitPosterTitle(plan, family, 184.5, TITLE_BOX.w * 184.5, (TITLE_BOX.h * 184.5) / POSTER_ASPECT);
    expect(wrappedLines(plan.title, family, fit.size, TITLE_BOX.w * 184.5, plan.titleTrack)).toBeLessThanOrEqual(fit.maxLines);
  });
});

describe('the face follows the writing system', () => {
  it('sets Chinese in the serif the samples used, and Latin in capitals of Abril', () => {
    expect(posterPlan('慢慢来', '').wordFace).toBe('serifsc');
    expect(posterPlan('slow', '').wordFace).toBe('abril');
    expect(posterPlan('slow', '').word).toBe('SLOW');
    expect(posterPlan('Größe', '').wordFace).toBe('abril');
    expect(posterPlan('Größe', '').word).toBe('GRÖSSE');
  });

  it('leaves every script it has no face for to the system, whole (D-148)', () => {
    for (const word of ['على مهلك', 'ค่อยๆ', 'не спеши', 'ゆっくり', 'धीरे धीरे', 'slow 慢']) {
      const plan = posterPlan(word, '');
      expect(plan.wordFace === null || faceCovers(plan.wordFace, plan.word)).toBe(true);
    }
    expect(posterPlan('على مهلك', '').wordFace).toBeNull();
    expect(posterPlan('ค่อยๆ', '').wordFace).toBeNull();
  });

  it('keeps the case of a script it has no capitals face for', () => {
    expect(posterPlan('не спеши', '').word).toBe('не спеши');
  });

  it('picks title faces the same way', () => {
    expect(posterPlan('', '来德国后').titleFace).toBe('kuaile');
    expect(posterPlan('', 'First friend').titleFace).toBe('kalam');
    expect(posterPlan('', 'أول صديق').titleFace).toBeNull();
  });

  it('gives stacked and joined scripts the height their marks need', () => {
    expect(posterScript('慢慢来')).toBe('square');
    expect(posterScript('SLOW')).toBe('plain');
    expect(posterScript('ค่อยๆ')).toBe('tall');
    expect(posterScript('على مهلك')).toBe('tall');
    expect(posterScript('धीरे')).toBe('tall');
  });

  it('runs Arabic and Hebrew titles from the right', () => {
    expect(posterPlan('', 'أول صديق').rtl).toBe(true);
    expect(posterPlan('', 'חבר ראשון').rtl).toBe(true);
    expect(posterPlan('', 'ค่อยๆ').rtl).toBe(false);
  });
});
