export type BuddyPricingMode = 'fixed' | 'free' | 'negotiable';

export const MAX_BUDDY_PRICE_CENTS = 1_000_000;

export function parseBuddyPriceCents(raw: string, mode: BuddyPricingMode): number | null {
  if (mode === 'free') return 0;

  const input = raw.trim();
  if (!input) return 0;
  if (input.startsWith('-')) return null;

  const numeric = input.replace(/[^0-9.,]/g, '');
  if (!/\d/.test(numeric)) return null;

  const lastSeparator = Math.max(numeric.lastIndexOf('.'), numeric.lastIndexOf(','));
  const digitsAfterSeparator = lastSeparator >= 0 ? numeric.length - lastSeparator - 1 : 0;
  const hasDecimalFraction = lastSeparator >= 0 && digitsAfterSeparator >= 1 && digitsAfterSeparator <= 2;
  const wholeDigits = (hasDecimalFraction ? numeric.slice(0, lastSeparator) : numeric).replace(/[.,]/g, '') || '0';
  const fractionDigits = hasDecimalFraction ? numeric.slice(lastSeparator + 1).padEnd(2, '0') : '00';
  const priceCents = Number(wholeDigits) * 100 + Number(fractionDigits);

  if (!Number.isSafeInteger(priceCents) || priceCents < 0 || priceCents > MAX_BUDDY_PRICE_CENTS) {
    return null;
  }
  return priceCents;
}

export function isBuddyPricingComplete(mode: BuddyPricingMode, priceCents: number | null): boolean {
  if (priceCents === null) return false;
  return mode !== 'fixed' || priceCents > 0;
}
