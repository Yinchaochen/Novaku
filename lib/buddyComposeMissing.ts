/**
 * What a Buddy composer form is still waiting for, in the order the form asks
 * for it. `null` means the post can be created.
 *
 * Lives outside the screen for the same reason as publishButtonState: reaching
 * this composer needs a signed-in session against a live API, so the rule
 * cannot be walked in a browser, and a rule only ever verified by hand is the
 * one that silently greys out a button six weeks later (D-127 addendum 3).
 */
export type BuddyMissingField =
  | 'description'
  | 'title'
  | 'body'
  | 'when'
  | 'where_to_buy'
  | 'destination_city'
  | 'service_city'
  | 'price';

export interface BuddyComposeState {
  isWish: boolean;
  title: string;
  body: string;
  serviceCity: string;
  whereToBuy: string;
  destinationCity: string;
  companionRange: { start: Date | null; end: Date | null };
  carryRange: { start: Date | null; end: Date | null };
  priceDecided: boolean;
}

export function firstMissingBuddyField(state: BuddyComposeState): BuddyMissingField | null {
  if (state.isWish) {
    if (!state.body.trim()) return 'description';
    if (!state.carryRange.start || !state.carryRange.end) return 'when';
    if (!state.whereToBuy.trim()) return 'where_to_buy';
    if (!state.destinationCity.trim()) return 'destination_city';
  } else {
    if (!state.title.trim()) return 'title';
    if (!state.body.trim()) return 'body';
    if (!state.companionRange.start || !state.companionRange.end) return 'when';
    if (!state.serviceCity.trim()) return 'service_city';
  }
  return state.priceDecided ? null : 'price';
}
