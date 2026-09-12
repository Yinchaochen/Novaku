import {
  coverPalette,
  coverPlan,
  coverSticker,
  estimateEm,
  pickHighlight,
  pickKeyLine,
  splitSentences,
} from '../postCover';

// The bodies below are the real ones from app/dev/_seededPosts.json. Every
// failure this file pins was found in that data, not imagined.

const BER_TITLE = 'Getting from BER into the city';
const BER_BODY =
  'To get from BER into the city smoothly, use the quickest routes available: FEX, S9, S45, and the express buses.\n\n' +
  'For the city trip, remember that an ABC ticket is needed.\n\n' +
  'That is the key point to check before you travel.';

const DE_TITLE = 'Neu-Hohenschönhausen als Miniatur im Jugendamt Lichtenberg';
const DE_BODY =
  'Die Wanderausstellung zeigt Neu-Hohenschönhausen im Miniaturformat: Die Großsiedlung wurde mit ' +
  'Klemmbausteinen im Maßstab 1:1250 nachgebaut. Zu sehen sind Bilder und Informationstafeln zur Entstehung.\n\n' +
  'Source: kulturdaten.berlin';

describe('splitSentences', () => {
  it('does not sever a German date at its ordinal point', () => {
    // "bis spätestens 22." was becoming a whole cover on its own.
    const parts = splitSentences('Die Hefte können bis spätestens 22. August 2026 abgegeben werden.');

    expect(parts).toHaveLength(1);
  });

  it('does not split a street number away from its street', () => {
    const parts = splitSentences('Das Amt sitzt in der Alten Str. 103, 13053 Berlin.');

    expect(parts).toHaveLength(1);
  });

  it('does not treat a scale ratio as a sentence end', () => {
    const parts = splitSentences('Im Maßstab 1:1250 nachgebaut. Zu sehen sind Bilder.');

    expect(parts).toHaveLength(2);
  });

  it('still splits ordinary English prose', () => {
    const parts = splitSentences('Think it over. Keep it open-ended. Then go.');

    expect(parts).toHaveLength(3);
  });

  it('splits Chinese, which has no space after its full stop', () => {
    const parts = splitSentences('市内へ行くなら切符が必要です。あとは歩けます。');

    expect(parts).toHaveLength(2);
  });
});

describe('pickKeyLine', () => {
  it('refuses the sentence that merely restates the title', () => {
    // "To get from BER into the city smoothly…" is the title again. The cover
    // sits directly above the title, so printing it there is an echo.
    const line = pickKeyLine(BER_BODY, BER_TITLE);

    expect(line).not.toContain('use the quickest routes');
    expect(line).toBe('For the city trip, remember that an ABC ticket is needed.');
  });

  it('reads only the first paragraph, so the source trailer never reaches a cover', () => {
    // The trailer is a credit line, and it survives translation into 106
    // languages — which a regex on the word "Source" would not.
    const line = pickKeyLine(DE_BODY, DE_TITLE);

    expect(line).not.toMatch(/kulturdaten/i);
  });

  it('drops a URL rather than printing it', () => {
    const line = pickKeyLine(
      'Book the slot online at https://service.berlin.de/termin first. Then bring your passport along.',
      'Booking an appointment',
    );

    expect(line).not.toMatch(/https?:/);
  });

  it('returns nothing when every sentence is the title again', () => {
    const line = pickKeyLine('Anmeldung in Berlin erklärt.', 'Anmeldung in Berlin erklärt');

    expect(line).toBe('');
  });

  it('returns nothing for a body too short to lift a sentence out of', () => {
    expect(pickKeyLine('Ja.', 'Some title')).toBe('');
    expect(pickKeyLine('', 'Some title')).toBe('');
  });

  it('does not call a sentence an echo because both contain "the"', () => {
    // The overlap metric counted every word over three letters and divided by
    // whichever side was shorter. A three-word title against a long sentence
    // sharing nothing but three instances of "the" scored a perfect 1.0, the
    // only candidate was thrown out, and the cover rendered blank.
    const line = pickKeyLine(
      'Step outside your usual routine and choose one part of the city you would not ' +
        'normally visit on purpose, then let the neighbourhood shape the whole afternoon.',
      'A quiet afternoon by the water',
    );

    expect(line).toMatch(/Step outside/);
  });

  it('ends a sentence after a word that merely ends in a digit', () => {
    // "…FEX, S9, S45." was not ending a sentence, because the character before
    // the stop was a digit. The whole following paragraph was swallowed into
    // one run, and that run restated the title, so the cover went blank.
    const line = pickKeyLine(
      'To get from BER into the city smoothly, use the quickest routes available: FEX, S9, S45.\n\n' +
        'For the city trip, remember that an ABC ticket is needed.',
      'Getting from BER into the city',
    );

    expect(line).toBe('For the city trip, remember that an ABC ticket is needed.');
  });

  it('prefers a sentence whose longest word fits over one whose does not', () => {
    // The penalty was gated on a hand-picked 11 while the smallest rung's line
    // holds 9.26em, so every token between the two was penalised by nothing.
    // "Berufsqualifikationen" measures 9.74 — inside that gap, which is why
    // the reported screenshot happened at all. Measured over 632 real German
    // kulturdaten descriptions, closing the gap moves 20 of 624 covers onto a
    // different, already-available, non-breaking sentence.
    const line = pickKeyLine(
      'Die Anerkennung ausländischer Berufsqualifikationen dauert.\n\n' +
        'Rechne mit mehreren Monaten und plane das früh ein.',
      'Anerkennung im Handwerk',
    );

    expect(line).toMatch(/Rechne mit mehreren Monaten/);
  });

  it('takes a sentence too long for any rung rather than showing nothing', () => {
    const line = pickKeyLine(
      'Step outside your usual routine and choose one part of the city you would not ' +
        'normally visit on purpose, then let the neighbourhood shape the whole afternoon.',
      'Unrelated heading',
    );

    expect(line.length).toBeGreaterThan(80);
  });

  it('catches a Chinese title echo, which word-splitting could not see', () => {
    // normalise() splits on whitespace, so a Chinese title is one long token
    // that matches nothing and the echo test never fired at all. 从机场进城 and
    // 进城最快的是机场快线 share 机场 and 进城 — the same sentence twice.
    const line = pickKeyLine(
      '进城最快的是机场快线。记得买一张 ABC 区的票，否则会被罚款。',
      '从机场进城',
    );

    expect(line).not.toMatch(/进城最快/);
    expect(line).toMatch(/罚款/);
  });

  it('does not call two different Chinese sentences an echo', () => {
    const line = pickKeyLine(
      '柏林的房租一年比一年贵。看房的时候记得带上收入证明和身份证件。',
      '在柏林找工作的第一步',
    );

    expect(line).toBeTruthy();
  });

  it('is deterministic', () => {
    const runs = new Set(Array.from({ length: 50 }, () => pickKeyLine(BER_BODY, BER_TITLE)));

    expect(runs.size).toBe(1);
  });
});

describe('estimateEm', () => {
  it('counts a CJK glyph as a full em and a Latin letter as about half', () => {
    expect(estimateEm('柏林租房')).toBeCloseTo(4, 5);
    expect(estimateEm('abcd')).toBeLessThan(2.5);
  });

  it('grows with length, which is all the size ladder asks of it', () => {
    expect(estimateEm('a short one')).toBeLessThan(estimateEm('a considerably longer sentence than that one'));
  });
});

describe('coverPlan', () => {
  const post = { id: 'post-abc', post_type: 'guide', title: BER_TITLE, body: BER_BODY };

  it('sets a short sentence large and a long one small, in rungs', () => {
    const short = coverPlan({ ...post, id: 'a' }, 'T', 'Bring the ABC ticket. It matters here.');
    const long = coverPlan(
      { ...post, id: 'a' },
      'T',
      'Step outside your usual routine and choose one Berlin district that you would not ' +
        'normally visit on purpose, then let the neighbourhood shape the whole afternoon.',
    );

    expect(short.sizeRatio).toBeGreaterThan(long.sizeRatio);
    // Leading tightens as size grows — the inverse relationship is the tell
    // that separates set type from typed text.
    expect(short.leading).toBeLessThan(long.leading);
  });

  it('never hands a rung more text than that rung can set', () => {
    // The bug this pins: the boundaries were chosen by hand and had no
    // relationship to the geometry they described, so a 33em sentence landed
    // in a rung whose five lines could hold 40em of *perfectly packed* text —
    // and clipped, because wrapping breaks at spaces and gives back most of a
    // word per line. Capacity is derived now; this asserts it stays derived.
    const MEASURE_UNITS = 12 / 18;
    const PACKING = 0.78;

    const sentences = [
      'Bring the ticket. It matters here today.',
      'For the city trip, remember that an ABC ticket is needed.',
      'The point is simply to explore a part of the city that is less familiar to you.',
      'Zu sehen sind Bilder und Informationstafeln zur Entstehung und zu den Beteiligten.',
    ];

    for (const sentence of sentences) {
      const plan = coverPlan({ ...post, title: 'zzz' }, 'zzz', sentence);
      const capacity = (MEASURE_UNITS / plan.sizeRatio) * plan.maxLines * PACKING;
      // The last rung is allowed to overflow — that is the clip path, and it
      // is deliberate. Every other rung must actually hold what it was given.
      if (plan.sizeRatio !== 0.072) {
        expect(estimateEm(plan.keyLine)).toBeLessThanOrEqual(capacity);
      }
    }
  });

  it('never emits a size between the rungs', () => {
    const allowed = [0.115, 0.098, 0.082, 0.072];
    for (const body of [
      'Bring the ticket. It matters.',
      'A somewhat longer sentence that will land on a different rung entirely.',
      'x'.repeat(400),
    ]) {
      expect(allowed).toContain(coverPlan(post, 'T', body).sizeRatio);
    }
  });

  it('drops an unbreakable German compound to the smallest rung', () => {
    // Nothing can wrap "Berufsqualifikationen"; it sets the size by itself
    // however short the sentence around it happens to be.
    const plan = coverPlan(post, 'T', 'Die Anerkennung ausländischer Berufsqualifikationen dauert.');

    expect(plan.sizeRatio).toBe(0.072);
  });

  it('sizes a short sentence down when its longest word will not fit a line', () => {
    // The bug: the clamp compared against the constant 9, which is the last
    // rung's line capacity. The four rungs hold 5.80 / 6.80 / 8.13 / 9.26 em
    // per line, so a short sentence with an 8em token landed on the largest
    // rung — whose line holds 5.80 — and broke mid-word with the clamp never
    // firing. Each rung is asked about its own line now.
    const MEASURE_UNITS = 12 / 18;
    const plan = coverPlan(post, 'T', 'Der Aufenthaltstitel gilt.');

    expect(plan.sizeRatio).toBeLessThan(0.115);
    // The real invariant: whatever rung is chosen, one of its lines holds the
    // longest word.
    const longest = estimateEm('Aufenthaltstitel');
    expect(MEASURE_UNITS / plan.sizeRatio).toBeGreaterThanOrEqual(longest);
  });

  it('never picks a rung whose line is narrower than the longest word', () => {
    const MEASURE_UNITS = 12 / 18;
    const sentences = [
      'Der Aufenthaltstitel gilt.',
      'Die Aufenthaltserlaubnis kommt.',
      'Bring the ticket. It matters here today.',
      'Die Anerkennung ausländischer Berufsqualifikationen dauert oft mehrere Monate.',
    ];

    for (const sentence of sentences) {
      const plan = coverPlan(post, 'zzz', sentence);
      const longest = Math.max(
        ...plan.keyLine.split(/\s+/).map((token) => estimateEm(token)),
      );
      // The smallest rung is the floor — past it the word genuinely cannot be
      // set on one line at a readable size, and that is the hyphenation case.
      if (plan.sizeRatio !== 0.072) {
        expect(MEASURE_UNITS / plan.sizeRatio).toBeGreaterThanOrEqual(longest);
      }
    }
  });

  it('gives one post the same ground every time it is drawn', () => {
    // The feed loops, so a reader scrolling back must meet the same object.
    const grounds = new Set(
      Array.from({ length: 50 }, () => coverPlan(post, BER_TITLE, BER_BODY).ground),
    );

    expect(grounds.size).toBe(1);
  });

  it('spreads STOCKS across different posts, which is where the variety moved', () => {
    // It used to be the ground that varied — dotted or plain — and that was
    // half of "too uniform": the plain half was a bare fill. The ground is now
    // always dotted because it is what holds the card's edge, so two posts of
    // one type are told apart by their paper instead.
    const papers = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(
        (id) => coverPlan({ ...post, id }, BER_TITLE, BER_BODY).palette.paper,
      ),
    );

    expect(papers.size).toBeGreaterThan(1);
  });

  it('marks a post with nothing to lift as blank rather than inventing a line', () => {
    const plan = coverPlan({ ...post, body: 'Ja.' }, 'Ja', 'Ja.');

    expect(plan.isBlank).toBe(true);
    expect(plan.keyLine).toBe('');
  });

  it('prefers the reader language over the stored one', () => {
    const plan = coverPlan(post, 'Von BER in die Stadt', 'Nimm den FEX. Ein ABC-Ticket brauchst du dafür.');

    expect(plan.keyLine).toMatch(/ABC-Ticket/);
  });
});

describe('coverPalette', () => {
  it('is chosen by post type, not by a hash', () => {
    expect(coverPalette('guide').paper).not.toBe(coverPalette('warning').paper);
    expect(coverPalette('guide')).toBe(coverPalette('guide'));
  });

  it('falls back rather than crashing on a type it has never seen', () => {
    expect(coverPalette('something_new').paper).toBeTruthy();
  });
});

describe('pickHighlight', () => {
  const LINE = 'Which authority decides depends on your profession and on the federal state.';

  it('loses no character between the three runs', () => {
    // The renderer prints before + span + after INSTEAD of the line, so a
    // dropped or duplicated character here is silent text corruption on a
    // cover — worse than no wash, and invisible to every other assertion.
    for (const line of [
      LINE,
      'An Ausbildung is not school and not an internship, it is a job with a classroom.',
      '德国把职业分成受管制和不受管制两类，医生和护理必须先通过资历认定才能执业。',
      'Die Chancenkarte ist der Weg, der keinen unterschriebenen Vertrag voraussetzt.',
    ]) {
      const h = pickHighlight(line);
      expect(h).not.toBeNull();
      expect(h!.before + h!.span + h!.after).toBe(line);
    }
  });

  it('never washes the whole line, which would be a coloured panel', () => {
    const h = pickHighlight(LINE);
    expect(h!.before.trim().length).toBeGreaterThan(0);
  });

  it('stops short of the full stop, the way a marker pen does', () => {
    expect(pickHighlight(LINE)!.after).toBe('.');
    expect(pickHighlight('Es gilt ein eigener Aufenthaltstitel für diesen Weg!')!.after).toBe('!');
  });

  it('leaves a short sentence alone, because the type is already the emphasis', () => {
    expect(pickHighlight('It does not renew.')).toBeNull();
    expect(pickHighlight('')).toBeNull();
  });

  it('takes the final clause when a break leaves one of a usable size', () => {
    const h = pickHighlight(
      'Most work visas want a signed contract first, the opportunity card does not.',
    );
    expect(h!.span).toBe('the opportunity card does not');
  });

  it('never starts mid-word in a script that has words', () => {
    for (const line of [
      LINE,
      'Gaps are better named briefly than hidden because they get asked about anyway.',
      'Der schulische Teil läuft auf Deutsch und das ist meist die eigentliche Hürde.',
    ]) {
      const h = pickHighlight(line)!;
      expect(h.before === '' || h.before.endsWith(' ')).toBe(true);
      expect(h.span.startsWith(' ')).toBe(false);
    }
  });

  it('washes Chinese, which has no spaces to snap to', () => {
    const h = pickHighlight('学生居留不会自动延续，下一个必须在旧的到期之前申请下来。');
    expect(h).not.toBeNull();
    expect(h!.span.length).toBeGreaterThan(1);
    expect(h!.before.length).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    expect(pickHighlight(LINE)).toEqual(pickHighlight(LINE));
  });
});

describe('coverSticker', () => {
  it('reads the slug, not the words, so translation cannot change it', () => {
    // The cover text is translated per reader. An English keyword list would
    // match for English readers and quietly hand everyone else the fallback.
    expect(coverSticker('guide', 'de_recognition_of_qualifications')).toBe('📜');
    expect(coverSticker('guide', 'de_after_you_graduate')).toBe('🎓');
    expect(coverSticker('guide', 'de_salary_and_deductions')).toBe('💶');
  });

  it('falls back to the post type when there is no slug', () => {
    expect(coverSticker('question', null)).toBe('💬');
    expect(coverSticker('warning', undefined)).toBe('⚠️');
  });

  it('gives one post the same stamp every time it is drawn', () => {
    expect(coverSticker('guide', 'berlin_anmeldung')).toBe(
      coverSticker('guide', 'berlin_anmeldung'),
    );
  });

  it('returns nothing rather than a wrong stamp for an unknown type', () => {
    expect(coverSticker('something_new', null)).toBeNull();
  });
});

/**
 * The stocks are a measurement, not a taste, so they are tested as one.
 *
 * D-088 had just finished fixing a cover that was invisible against its own
 * page when the first palette was written, and the note on the palette says so.
 * Every constraint below is the reason one of the ten looks the way it does,
 * and a future edit toward "warmer" or "softer" trips whichever one it breaks
 * instead of shipping a card nobody can see.
 */
const PAGE = ['#FFFAF2', '#FBEDDF']; // the app's cream gradient, both ends
const INK = '#241A16';

function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}
function linear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function relLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function toLab(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex).map(linear);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
function deltaE(a: string, b: string): number {
  const [la, aa, ba] = toLab(a);
  const [lb, ab, bb] = toLab(b);
  return Math.hypot(la - lb, aa - ab, ba - bb);
}
function hueAngle(hex: string): number {
  const [, a, b] = toLab(hex);
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
}
function hueGap(a: string, b: string): number {
  const d = Math.abs(hueAngle(a) - hueAngle(b));
  return Math.min(d, 360 - d);
}

const TYPES = ['guide', 'question', 'recommendation', 'experience', 'warning'];
const STOCKS = TYPES.flatMap((t) => [
  { name: `${t}/0`, p: coverPalette(t, 0) },
  { name: `${t}/1`, p: coverPalette(t, 1) },
]);

describe('the stocks', () => {
  it.each(STOCKS)('$name carries the structure that holds its edge', ({ p }) => {
    // These stocks are Xiaohongshu's and they sit ΔE 2.9-10.2 from our page, so
    // the fill is NOT what separates the card from the background — the print
    // on it is. D-088's "14 units and invisible" was measured on a flat panel;
    // this one has a watermark, a dot field, a margin rule and a corner radius.
    // The dots therefore have to be genuinely visible, which is the one part of
    // that structure this module owns. If a future edit softens them back
    // toward invisible, the card goes with them.
    expect(contrast(p.paper, p.dot)).toBeGreaterThanOrEqual(1.25);
    expect(contrast(p.paper, p.dot)).toBeLessThanOrEqual(1.45);
  });

  it('never draws a bare fill, which on these stocks would be no card at all', () => {
    const plan = coverPlan(
      { id: 'ground-1', post_type: 'guide', title: 'T', body: 'A sentence worth lifting out of a post.' },
      '',
      '',
    );
    expect(plan.ground).toBe('dotted');
  });

  it.each(STOCKS)('$name is a second colour, not a tint of the paper', ({ p }) => {
    // What lisum actually pointed at: butter wash on butter paper reads as one
    // colour. Xiaohongshu puts a blue highlight on a cream ground.
    //
    // Hue angle alone cannot say this. A near-neutral paper has no stable hue —
    // #F5F1E8 is within a couple of units of grey, so its angle is noise, and
    // the first version of this test failed four perfectly good pairs on it.
    // Against a neutral ground ANY coloured wash is already a second colour;
    // it is only a coloured ground that has to be argued with.
    const chroma = (hex: string) => Math.hypot(toLab(hex)[1], toLab(hex)[2]);
    expect(deltaE(p.paper, p.wash)).toBeGreaterThanOrEqual(12);
    if (chroma(p.paper) >= 6) {
      expect(hueGap(p.paper, p.wash)).toBeGreaterThanOrEqual(45);
    } else {
      expect(chroma(p.wash)).toBeGreaterThanOrEqual(12);
    }
  });

  it.each(STOCKS)('$name keeps the sentence readable through the wash', ({ p }) => {
    // The highlight sits BEHIND the body ink; if it darkens the ink stops being
    // readable, and a highlight that costs legibility is not a highlight.
    expect(contrast(INK, p.wash)).toBeGreaterThanOrEqual(7);
    expect(contrast(INK, p.paper)).toBeGreaterThanOrEqual(7);
  });

  it.each(STOCKS)('$name keeps the rubric at its stated ~5:1', ({ p }) => {
    expect(contrast(p.paper, p.secondary)).toBeGreaterThanOrEqual(4.5);
  });

  it('gives each post type two different stocks, so a feed does not repeat', () => {
    for (const t of TYPES) expect(coverPalette(t, 0).paper).not.toBe(coverPalette(t, 1).paper);
  });

  it('is papery rather than candied', () => {
    const chroma = (hex: string) => Math.hypot(toLab(hex)[1], toLab(hex)[2]);
    const mean = STOCKS.reduce((sum, s) => sum + chroma(s.p.paper), 0) / STOCKS.length;
    expect(mean).toBeLessThan(10); // the first stocks averaged 20.2
  });
});

describe('the wash and a clipped line', () => {
  it('does not mark the tail when the tail is what got cut off', () => {
    // Real Make It copy. The sentence overruns the smallest rung, so it ends
    // "…and your federal state, so there is" — and the wash, which always goes
    // on the tail, was landing on the fragment the clip created.
    const plan = coverPlan(
      {
        id: 'clip-1',
        post_type: 'guide',
        title: 'Whether your qualification counts here',
        body:
          'Which authority decides depends on your profession and your federal state, '
          + 'so there is no single office to write to and no single answer to give you.',
      },
      '',
      '',
    );
    expect(plan.keyLine.length).toBeGreaterThan(0);
    expect(plan.highlight).toBeNull();
  });

  it('still marks a line that fits', () => {
    const plan = coverPlan(
      {
        id: 'clip-2',
        post_type: 'guide',
        title: 'Coming to look',
        body: 'Most work visas want a signed contract first, the opportunity card does not.',
      },
      '',
      '',
    );
    expect(plan.highlight).not.toBeNull();
  });
});

describe('the sticker and the author\'s own words', () => {
  it('reads the theme, which is what a user post carries instead of a slug', () => {
    // lisum asked for a sticker chosen from what the author wrote. The
    // classification is done server-side, once, on the ORIGINAL text
    // (community_posts.theme, D-096) — fourteen tokens that mean the same in
    // every locale. Matching the cover's own words could not do this: the
    // cover is translated per reader.
    expect(coverSticker('experience', null, 'housing')).toBe('🔑');
    expect(coverSticker('experience', null, 'money')).toBe('💶');
    expect(coverSticker('question', null, 'bureaucracy')).toBe('📋');
  });

  it('lets a slug beat a theme, because a slug is about one step', () => {
    expect(coverSticker('guide', 'de_recognition_of_qualifications', 'career')).toBe('📜');
  });

  it('falls back to the post type when there is neither', () => {
    expect(coverSticker('warning', null, null)).toBe('⚠️');
  });

  it('ignores a theme outside the closed vocabulary rather than guessing', () => {
    // The backend stores anything unrecognised as NULL, but a client should not
    // rely on that to avoid inventing a stamp for a token it does not know.
    expect(coverSticker('guide', null, 'something_new')).toBe('🧭');
  });

  it('covers every theme the backend can store', () => {
    // If the backend vocabulary grows and this does not, those posts silently
    // drop to the post-type stamp and nobody finds out.
    const BACKEND_THEMES = [
      'startup', 'career', 'bureaucracy', 'housing', 'money', 'health', 'transport',
      'food_drink', 'culture', 'places', 'education', 'language', 'social', 'shopping',
    ];
    for (const theme of BACKEND_THEMES) {
      expect(coverSticker('guide', null, theme)).not.toBe('🧭');
    }
  });
});
