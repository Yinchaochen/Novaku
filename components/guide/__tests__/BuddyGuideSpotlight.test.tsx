import { render } from '@testing-library/react-native';

import type { BuddyGuideStep } from '../../../features/guide/buddyGuide';
import { BuddyGuideSpotlight } from '../BuddyGuideSpotlight';

let mockGuideStep: BuddyGuideStep = 'feed_intro';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      guide: {
        continue_step: 'Continue',
        finish_tour: 'Finish tour',
      },
      buddy_guide: new Proxy({}, { get: (_target, key) => String(key) }),
    },
  }),
}));

jest.mock('../../../features/guide/useBuddyGuide', () => ({
  useBuddyGuide: () => ({
    step: mockGuideStep,
    confirmingPublish: false,
    goBack: jest.fn(),
    end: jest.fn(),
    advance: jest.fn(),
    cancelPublishConfirm: jest.fn(),
  }),
}));

jest.mock('../SpotlightOverlay', () => ({
  SpotlightOverlay: ({ continueLabel }: { continueLabel?: string }) => {
    const { View: MockView } = require('react-native');
    return <MockView testID="mock.spotlight" accessibilityLabel={continueLabel} />;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('BuddyGuideSpotlight primary action', () => {
  it('labels an intermediate step as Continue', async () => {
    mockGuideStep = 'feed_intro';
    const screen = await render(<BuddyGuideSpotlight chapter="feed" />);

    expect(screen.getByTestId('mock.spotlight').props.accessibilityLabel).toBe('Continue');
  });

  it('labels the last chapter step as Finish tour', async () => {
    mockGuideStep = 'feed_create';
    const screen = await render(<BuddyGuideSpotlight chapter="feed" />);

    expect(screen.getByTestId('mock.spotlight').props.accessibilityLabel).toBe('Finish tour');
  });
});
