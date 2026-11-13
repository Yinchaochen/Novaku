/**
 * Whether the Plaza composer's Post button is pressable, and how solid it looks.
 *
 * The button sits in a footer pinned to the bottom of the composer; the title
 * and body it is waiting for are several screens above it. So a Post button
 * that greys out on an incomplete form tells the reader nothing at all — which
 * is what a user hit on 2026-11-13, with the location, the date, the type and
 * the visibility all filled in and no way to find out what was missing.
 *
 * The screen already has onInvalid, which names the short field and scrolls
 * back to it. D-127 added that and, in the same commit, disabled the only
 * button that could fire it. So: busy is the one state that is truly dead,
 * because the press has nowhere to go. An incomplete form stays pressable and
 * answers.
 *
 * Kept out of the screen as a pure function for the reason its sibling
 * composeButtonVisibility gives: the composer needs a signed-in session
 * against a live API, so this rule cannot be walked in a browser.
 */

/** In flight: pressing truly cannot do anything, so it reads as switched off. */
export const OPACITY_BUSY = 0.45;

/** Not ready, but it will say why — dimmed, not dead. */
export const OPACITY_INCOMPLETE = 0.7;

export interface PublishButtonInput {
  /** A create or update mutation is in flight. */
  isSubmitting: boolean;
  /** Photos or a video are still on their way to R2. */
  isUploadingMedia: boolean;
  /** Title and body already satisfy the post schema. */
  canSubmit: boolean;
}

export interface PublishButtonState {
  disabled: boolean;
  opacity: number;
}

export function publishButtonState(input: PublishButtonInput): PublishButtonState {
  if (input.isSubmitting || input.isUploadingMedia) {
    return { disabled: true, opacity: OPACITY_BUSY };
  }
  if (!input.canSubmit) {
    return { disabled: false, opacity: OPACITY_INCOMPLETE };
  }
  return { disabled: false, opacity: 1 };
}
