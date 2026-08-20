import { render } from '@testing-library/react-native';

import { GuideStepCard } from '../spotlightParts';

describe('GuideStepCard actions', () => {
  it('keeps the primary action at least 44dp tall', async () => {
    const screen = await render(
      <GuideStepCard
        stepNumber={4}
        stepCount={4}
        title="Post your own"
        body="Tap + and choose what you need."
        backLabel="Back"
        skipAllLabel="Skip the tour"
        continueLabel="Finish tour"
        showBack
        onBack={jest.fn()}
        onSkipAll={jest.fn()}
        onContinue={jest.fn()}
        progressTemplate="Step {current} of {total}"
      />,
    );

    expect(screen.getByTestId('guide.card.continue')).toHaveStyle({ minHeight: 44 });
  });
});
