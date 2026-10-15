/**
 * The feedback screen's states (2026-10-15). Web cannot take the screenshot,
 * so the preview state is only reachable here.
 */

import { act, fireEvent, render } from '@testing-library/react-native';

import en from '../../locales/en/common.json';
import { useFeedbackDraftStore } from '../../store/feedbackDraftStore';
import FeedbackScreen from '../feedback';

const mockMutate = jest.fn();
let mockUser: object | null = null;

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: (props: object) => <View {...props} /> };
});
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../components/Screen', () => {
  const { View } = require('react-native');
  return { Screen: ({ header, children }: { header: unknown; children: unknown }) => <View>{header as never}{children as never}</View> };
});
jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ t: require('../../locales/en/common.json'), langCode: 'en' }),
}));
jest.mock('../../store/authStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({ user: mockUser }),
}));
jest.mock('../../features/feedback/useFeedback', () => ({
  WHATSAPP_GROUP_URL: 'https://chat.whatsapp.com/x',
  useSendFeedback: () => ({ mutate: mockMutate, isPending: false }),
}));
jest.mock('../../lib/links', () => ({ openExternalUrl: jest.fn() }));

beforeEach(() => {
  mockMutate.mockReset();
  mockUser = null;
  useFeedbackDraftStore.setState({ screenshotBase64: null, screen: '/plaza' });
});

it('asks a guest for an optional email and shows no screenshot block without one', async () => {
  const tree = await render(<FeedbackScreen />);
  expect(tree.getByTestId('feedback.email')).toBeTruthy();
  expect(tree.queryByTestId('feedback.screenshot-preview')).toBeNull();
  expect(tree.getByText(en.feedback.whatsapp_inline)).toBeTruthy();
});

it('does not ask a signed-in user for an email', async () => {
  mockUser = { id: 'u1' };
  const tree = await render(<FeedbackScreen />);
  expect(tree.queryByTestId('feedback.email')).toBeNull();
});

it('shows the masked screenshot with what it is for, and lets the user drop it', async () => {
  useFeedbackDraftStore.setState({ screenshotBase64: 'AAAA', screen: '/plaza' });
  const tree = await render(<FeedbackScreen />);
  expect(tree.getByTestId('feedback.screenshot-preview')).toBeTruthy();
  expect(tree.getByText(en.feedback.screenshot_note)).toBeTruthy();
  expect(tree.getByText(en.feedback.purpose_title)).toBeTruthy();
  expect(tree.getByText(en.feedback.purpose_body)).toBeTruthy();

  await act(async () => fireEvent.press(tree.getByTestId('feedback.remove-screenshot')));
  expect(tree.queryByTestId('feedback.screenshot-preview')).toBeNull();
  expect(useFeedbackDraftStore.getState().screenshotBase64).toBeNull();
});

it('sends the trimmed text and the guest email', async () => {
  const tree = await render(<FeedbackScreen />);
  await act(async () => fireEvent.press(tree.getByText(en.feedback.send)));
  expect(mockMutate).not.toHaveBeenCalled();

  await act(async () => fireEvent.changeText(tree.getByTestId('feedback.body'), '  The map is blank  '));
  await act(async () => fireEvent.changeText(tree.getByTestId('feedback.email'), 'a@b.de'));
  await act(async () => fireEvent.press(tree.getByText(en.feedback.send)));
  expect(mockMutate).toHaveBeenCalledWith(
    { body: 'The map is blank', contactEmail: 'a@b.de' },
    expect.anything(),
  );
});
