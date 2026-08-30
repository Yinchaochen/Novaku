import {
  coverPalette,
  coverPlan,
  estimateEm,
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

  it('takes a sentence too long for any rung rather than showing nothing', () => {
    const line = pickKeyLine(
      'Step outside your usual routine and choose one part of the city you would not ' +
        'normally visit on purpose, then let the neighbourhood shape the whole afternoon.',
      'Unrelated heading',
    );

    expect(line.length).toBeGreaterThan(80);
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

  it('gives one post the same ground every time it is drawn', () => {
    // The feed loops, so a reader scrolling back must meet the same object.
    const grounds = new Set(
      Array.from({ length: 50 }, () => coverPlan(post, BER_TITLE, BER_BODY).ground),
    );

    expect(grounds.size).toBe(1);
  });

  it('spreads grounds across different posts', () => {
    const grounds = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(
        (id) => coverPlan({ ...post, id }, BER_TITLE, BER_BODY).ground,
      ),
    );

    expect(grounds.size).toBeGreaterThan(1);
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
