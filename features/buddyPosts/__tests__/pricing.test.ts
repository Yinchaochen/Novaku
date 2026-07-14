import { isBuddyPricingComplete, parseBuddyPriceCents } from '../pricing';

describe('Buddy pricing', () => {
  it.each([
    ['25', 2500],
    ['12,50', 1250],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
  ])('parses a fixed price of %s', (raw, expected) => {
    expect(parseBuddyPriceCents(raw, 'fixed')).toBe(expected);
  });

  it('accepts an entered fixed amount as a complete price', () => {
    const priceCents = parseBuddyPriceCents('32', 'fixed');

    expect(isBuddyPricingComplete('fixed', priceCents)).toBe(true);
  });

  it('requires an amount for fixed pricing', () => {
    const priceCents = parseBuddyPriceCents('', 'fixed');

    expect(priceCents).toBe(0);
    expect(isBuddyPricingComplete('fixed', priceCents)).toBe(false);
  });

  it('keeps free and negotiable pricing available without an amount', () => {
    expect(parseBuddyPriceCents('99', 'free')).toBe(0);
    expect(isBuddyPricingComplete('free', 0)).toBe(true);

    const negotiablePrice = parseBuddyPriceCents('', 'negotiable');
    expect(negotiablePrice).toBe(0);
    expect(isBuddyPricingComplete('negotiable', negotiablePrice)).toBe(true);
  });

  it('rejects prices above the API limit', () => {
    const priceCents = parseBuddyPriceCents('10000,01', 'fixed');

    expect(priceCents).toBeNull();
    expect(isBuddyPricingComplete('fixed', priceCents)).toBe(false);
  });
});
