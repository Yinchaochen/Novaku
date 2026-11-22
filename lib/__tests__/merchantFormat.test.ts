import {
  defaultOpeningHours,
  formatRanges,
  groupOpeningHours,
  hhmm,
  minutesOf,
  parsePriceInput,
  priceInputFromCents,
} from '../merchantFormat';

describe('parsePriceInput', () => {
  it('reads dots and commas as the decimal mark', () => {
    expect(parsePriceInput('2.40')).toBe(240);
    expect(parsePriceInput('2,4')).toBe(240);
    expect(parsePriceInput(' 12 ')).toBe(1200);
  });

  it('treats an empty field as "ask in the shop"', () => {
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('   ')).toBeNull();
  });

  it('refuses what is not a price', () => {
    expect(parsePriceInput('2.405')).toBeUndefined();
    expect(parsePriceInput('-1')).toBeUndefined();
    expect(parsePriceInput('two')).toBeUndefined();
    expect(parsePriceInput('1000000.00')).toBeUndefined();
  });

  it('round-trips through the edit field', () => {
    expect(priceInputFromCents(240)).toBe('2.40');
    expect(priceInputFromCents(null)).toBe('');
    expect(parsePriceInput(priceInputFromCents(1999))).toBe(1999);
  });
});

describe('groupOpeningHours', () => {
  it('collapses consecutive days with the same hours', () => {
    const hours = defaultOpeningHours();
    hours.sat = [{ open: '07:00', close: '14:00' }];
    const groups = groupOpeningHours(hours);
    expect(groups.map((group) => group.days)).toEqual([
      ['mon', 'tue', 'wed', 'thu', 'fri'],
      ['sat'],
      ['sun'],
    ]);
    expect(groups[2].ranges).toEqual([]);
  });

  it('treats a missing day as closed', () => {
    const groups = groupOpeningHours({ mon: [{ open: '08:00', close: '12:00' }] });
    expect(groups[0]).toEqual({ days: ['mon'], ranges: [{ open: '08:00', close: '12:00' }] });
    expect(groups[1].days).toEqual(['tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  });

  it('formats split days', () => {
    expect(formatRanges([{ open: '08:00', close: '12:00' }, { open: '14:00', close: '18:00' }])).toBe(
      '08:00–12:00, 14:00–18:00',
    );
  });
});

describe('time helpers', () => {
  it('converts both ways and clamps at a day', () => {
    expect(minutesOf('07:30')).toBe(450);
    expect(minutesOf('24:00')).toBe(1440);
    expect(hhmm(450)).toBe('07:30');
    expect(hhmm(2000)).toBe('24:00');
    expect(hhmm(-5)).toBe('00:00');
  });
});
