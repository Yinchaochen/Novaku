import { usePlazaComposeIntentStore } from '../plazaComposeIntentStore';
import type { CommunityPost } from '../../features/community/useCommunity';

describe('usePlazaComposeIntentStore', () => {
  beforeEach(() => {
    usePlazaComposeIntentStore.setState({ intent: null });
  });

  it('consume returns the intent exactly once', () => {
    usePlazaComposeIntentStore.getState().setIntent({ kind: 'ask', title: 'Anmeldung Termin', postType: 'question' });

    const first = usePlazaComposeIntentStore.getState().consume();
    expect(first).toEqual({ kind: 'ask', title: 'Anmeldung Termin', postType: 'question' });

    const second = usePlazaComposeIntentStore.getState().consume();
    expect(second).toBeNull();
  });

  it('carries a post to edit, once', () => {
    const post = { id: 'post-1', title: 'Anmeldung ohne Termin' } as CommunityPost;
    usePlazaComposeIntentStore.getState().setIntent({ kind: 'edit', post });

    const first = usePlazaComposeIntentStore.getState().consume();
    expect(first).toEqual({ kind: 'edit', post });
    expect(first && first.kind === 'edit' ? first.post : null).toBe(post);

    expect(usePlazaComposeIntentStore.getState().consume()).toBeNull();
  });
});
