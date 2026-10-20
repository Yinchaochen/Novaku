// Google caps its rendered sign-in button at 400px and refuses below 200.
export const GOOGLE_BUTTON_MIN_WIDTH = 200;
export const GOOGLE_BUTTON_MAX_WIDTH = 400;

export function buttonWidthFor(containerWidth: number): number {
  return Math.min(GOOGLE_BUTTON_MAX_WIDTH, Math.max(GOOGLE_BUTTON_MIN_WIDTH, Math.floor(containerWidth)));
}
