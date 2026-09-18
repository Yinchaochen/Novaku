import { create } from 'zustand';

import { useAuthStore } from './authStore';

/**
 * The sign-in sheet, and what to do once the reader has signed in (D-151).
 *
 * On the web a reader browses without an account. The moment they try to do
 * something that needs one — mark a post helpful, save it, comment, post,
 * follow — the sheet opens over the page they are on, rather than the app
 * throwing them onto a login route and losing their place in the wall.
 *
 * The action they tried is held, not dropped. Asking someone to sign in to
 * save a post and then making them find the post and press save again is the
 * cost that makes people close the tab; so a successful sign-in replays it.
 */
interface SignInPromptState {
  visible: boolean;
  /** What the reader was trying to do, replayed once they are signed in. */
  pending: (() => void) | null;
  open: (then?: () => void) => void;
  close: () => void;
  /** Called by the sheet when auth lands: run the held action, then close. */
  resolve: () => void;
}

export const useSignInPromptStore = create<SignInPromptState>((set, get) => ({
  visible: false,
  pending: null,
  open: (then) => set({ visible: true, pending: then ?? null }),
  close: () => set({ visible: false, pending: null }),
  resolve: () => {
    const action = get().pending;
    set({ visible: false, pending: null });
    action?.();
  },
}));

/**
 * Run `action` if the reader is signed in; otherwise ask them to sign in and
 * run it afterwards. Read from the store rather than from a hook argument so a
 * handler that closed over a stale `user` still sees the current answer.
 */
export function requireSignIn(action: () => void): void {
  if (useAuthStore.getState().isAuthenticated) {
    action();
    return;
  }
  useSignInPromptStore.getState().open(action);
}
