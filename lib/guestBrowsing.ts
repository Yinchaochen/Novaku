/**
 * What someone without an account may read, and where (D-151).
 *
 * The web is where a stranger arrives from a shared link or a search result,
 * and a login wall in front of the first post they ever see is the whole
 * reason they leave. So on the web the Plaza is readable without an account:
 * the wall, a post, its comments, search, and the author of a post. Everything
 * that writes — helpful, save, comment, post, follow — asks for sign-in at the
 * moment it is tried (store/signInPromptStore.ts), not before.
 *
 * The native apps keep their sign-in-first flow. They are installed on purpose,
 * onboarding runs there, and nothing about the store listings changes.
 */

/** Route roots a guest may read on the web. */
const GUEST_ROUTE_ROOTS = new Set(['plaza', 'p', 'users']);

export function isGuestBrowsable(segments: readonly string[], platform: string): boolean {
  if (platform !== 'web') return false;
  const [first, second] = segments;
  // The Plaza tab itself lives under the (tabs) group.
  if (first === '(tabs)') return second === 'plaza';
  return first !== undefined && GUEST_ROUTE_ROOTS.has(first);
}

/** Where a signed-out reader lands when they open the app's root URL. */
export function signedOutLanding(platform: string): '/plaza' | '/login' {
  return platform === 'web' ? '/plaza' : '/login';
}
