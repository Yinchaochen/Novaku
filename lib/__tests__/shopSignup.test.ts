import { EMPTY_SHOP_SIGNUP, normalizeShopLink, openedMonthValid, shopSignupPayload } from '../shopSignup';

const TODAY = new Date(2026, 10, 23); // 23 November 2026

describe('openedMonthValid', () => {
  it('takes a past month and a month up to a year ahead', () => {
    expect(openedMonthValid('2019', 3, TODAY)).toBe(true);
    expect(openedMonthValid('2027', 11, TODAY)).toBe(true);
  });

  it('refuses a month more than a year ahead, a short year and no month', () => {
    expect(openedMonthValid('2027', 12, TODAY)).toBe(false);
    expect(openedMonthValid('19', 3, TODAY)).toBe(false);
    expect(openedMonthValid('1750', 3, TODAY)).toBe(false);
    expect(openedMonthValid('2019', null, TODAY)).toBe(false);
  });
});

describe('shopSignupPayload', () => {
  const complete = { openedYear: ' 2019 ', openedMonth: 3, category: 'cafe' as const, categoryOther: '', ownerIsAdult: true };

  it('builds the payload once everything is there', () => {
    expect(shopSignupPayload(complete, TODAY)).toEqual({
      opened_year: 2019,
      opened_month: 3,
      category: 'cafe',
      category_other: null,
      owner_is_adult: true,
    });
  });

  it('waits for the adult confirmation, the category and its name for "other"', () => {
    expect(shopSignupPayload(EMPTY_SHOP_SIGNUP, TODAY)).toBeNull();
    expect(shopSignupPayload({ ...complete, ownerIsAdult: false }, TODAY)).toBeNull();
    expect(shopSignupPayload({ ...complete, category: null }, TODAY)).toBeNull();
    expect(shopSignupPayload({ ...complete, category: 'other' }, TODAY)).toBeNull();
    expect(shopSignupPayload({ ...complete, category: 'other', categoryOther: ' Tattoo ' }, TODAY)).toMatchObject({
      category: 'other',
      category_other: 'Tattoo',
    });
  });
});

describe('normalizeShopLink', () => {
  it('puts https:// in front of a bare address', () => {
    expect(normalizeShopLink(' kiezprints.de ')).toBe('https://kiezprints.de');
    expect(normalizeShopLink('www.kiezprints.de/impressum')).toBe('https://www.kiezprints.de/impressum');
  });

  it('leaves a link with a scheme, and an empty field, as they are', () => {
    expect(normalizeShopLink('https://kiezprints.de')).toBe('https://kiezprints.de');
    expect(normalizeShopLink('http://kiezprints.de')).toBe('http://kiezprints.de');
    expect(normalizeShopLink('  ')).toBe('');
  });
});
