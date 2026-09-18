/**
 * The sign-in sheet holds what the reader was trying to do (D-151).
 *
 * Asking someone to sign in to save a post and then making them find the post
 * and press save again is the cost that makes people close the tab. So the
 * action is replayed once they are in — and it must never run for someone who
 * dismissed the sheet instead.
 */

import { useAuthStore } from '../authStore';
import { requireSignIn, useSignInPromptStore } from '../signInPromptStore';

function reset(authenticated: boolean) {
  useAuthStore.setState({ isAuthenticated: authenticated });
  useSignInPromptStore.setState({ visible: false, pending: null });
}

describe('requireSignIn', () => {
  it('just does it for someone already signed in', () => {
    reset(true);
    const action = jest.fn();

    requireSignIn(action);

    expect(action).toHaveBeenCalledTimes(1);
    expect(useSignInPromptStore.getState().visible).toBe(false);
  });

  it('opens the sheet for a guest and does not act yet', () => {
    reset(false);
    const action = jest.fn();

    requireSignIn(action);

    expect(action).not.toHaveBeenCalled();
    expect(useSignInPromptStore.getState().visible).toBe(true);
  });

  it('replays the held action once the reader signs in', () => {
    reset(false);
    const action = jest.fn();
    requireSignIn(action);

    useSignInPromptStore.getState().resolve();

    expect(action).toHaveBeenCalledTimes(1);
    expect(useSignInPromptStore.getState().visible).toBe(false);
  });

  it('drops the held action when the reader dismisses the sheet', () => {
    reset(false);
    const action = jest.fn();
    requireSignIn(action);

    useSignInPromptStore.getState().close();
    useSignInPromptStore.getState().resolve();

    expect(action).not.toHaveBeenCalled();
  });
});
