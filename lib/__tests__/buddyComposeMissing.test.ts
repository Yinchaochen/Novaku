import { firstMissingBuddyField, type BuddyComposeState } from '../buddyComposeMissing';

const base: BuddyComposeState = {
  isWish: false,
  title: '',
  body: '',
  serviceCity: '',
  whereToBuy: '',
  destinationCity: '',
  companionRange: { start: null, end: null },
  carryRange: { start: null, end: null },
  priceDecided: false,
};

const day = (n: number) => new Date(2026, 10, n);

const companion = (over: Partial<BuddyComposeState> = {}): BuddyComposeState => ({
  ...base,
  title: 'Anmeldung together',
  body: 'I can come along and translate.',
  serviceCity: 'Berlin',
  companionRange: { start: day(20), end: day(20) },
  priceDecided: true,
  ...over,
});

const wish = (over: Partial<BuddyComposeState> = {}): BuddyComposeState => ({
  ...base,
  isWish: true,
  body: 'A pack of Pu-erh tea, the one in the paper wrapper.',
  whereToBuy: 'Any tea shop in Kunming',
  destinationCity: 'Berlin',
  carryRange: { start: day(20), end: day(28) },
  priceDecided: true,
  ...over,
});

describe('firstMissingBuddyField', () => {
  it('passes a complete companion post', () => {
    expect(firstMissingBuddyField(companion())).toBeNull();
  });

  it('passes a complete wish', () => {
    expect(firstMissingBuddyField(wish())).toBeNull();
  });

  it('names fields in the order the companion form asks for them', () => {
    expect(firstMissingBuddyField(companion({ title: '', body: '', serviceCity: '' }))).toBe('title');
    expect(firstMissingBuddyField(companion({ body: '', serviceCity: '' }))).toBe('body');
    expect(firstMissingBuddyField(companion({ companionRange: { start: null, end: null }, serviceCity: '' })))
      .toBe('when');
    expect(firstMissingBuddyField(companion({ serviceCity: '' }))).toBe('service_city');
  });

  it('names fields in the order the wish form asks for them', () => {
    expect(firstMissingBuddyField(wish({ body: '', whereToBuy: '' }))).toBe('description');
    expect(firstMissingBuddyField(wish({ carryRange: { start: null, end: null }, whereToBuy: '' })))
      .toBe('when');
    expect(firstMissingBuddyField(wish({ whereToBuy: '' }))).toBe('where_to_buy');
    expect(firstMissingBuddyField(wish({ destinationCity: '' }))).toBe('destination_city');
  });

  it('asks for the price last, once everything else is there', () => {
    expect(firstMissingBuddyField(companion({ priceDecided: false }))).toBe('price');
    expect(firstMissingBuddyField(wish({ priceDecided: false }))).toBe('price');
  });

  it('treats whitespace as empty', () => {
    expect(firstMissingBuddyField(companion({ title: '   ' }))).toBe('title');
    expect(firstMissingBuddyField(wish({ whereToBuy: '\n ' }))).toBe('where_to_buy');
  });

  it('never asks a wish for a title, which it does not have', () => {
    expect(firstMissingBuddyField(wish({ title: '' }))).toBeNull();
  });

  it('needs both ends of a date range', () => {
    expect(firstMissingBuddyField(companion({ companionRange: { start: day(20), end: null } }))).toBe('when');
    expect(firstMissingBuddyField(wish({ carryRange: { start: null, end: day(28) } }))).toBe('when');
  });
});
