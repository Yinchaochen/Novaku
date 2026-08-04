import { usePlazaComposeIntentStore } from '../plazaComposeIntentStore';

describe('usePlazaComposeIntentStore', () => {
  beforeEach(() => {
    usePlazaComposeIntentStore.setState({ intent: null });
  });

  it('consume returns the intent exactly once', () => {
    usePlazaComposeIntentStore.getState().setIntent({ title: 'Anmeldung Termin', postType: 'question' });

    const first = usePlazaComposeIntentStore.getState().consume();
    expect(first).toEqual({ title: 'Anmeldung Termin', postType: 'question' });

    const second = usePlazaComposeIntentStore.getState().consume();
    expect(second).toBeNull();
  });
});
