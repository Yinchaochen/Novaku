import { render } from '@testing-library/react-native';

import LoginScreen from '../login';
import RegisterScreen from '../register';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonType: { CONTINUE: 'continue' },
  AppleAuthenticationButtonStyle: { BLACK: 'black' },
}));
jest.mock('../../../context/LanguageContext', () => {
  const t = require('../../../locales/en/common.json');
  return {
    useLanguage: () => ({
      langCode: 'en',
      setLangCode: jest.fn(),
      t,
    }),
  };
});
jest.mock('../../../features/auth/useAuth', () => ({
  getApiErrorCode: jest.fn(() => null),
  useLogin: () => ({ error: null, isError: false, isPending: false, mutate: jest.fn() }),
  useRegister: () => ({ error: null, isError: false, isPending: false, mutate: jest.fn() }),
}));
jest.mock('../../../features/auth/useOAuth', () => ({
  useGoogleLogin: () => ({
    request: true,
    signIn: jest.fn(),
    isPending: false,
    isError: false,
    errorCode: null,
  }),
  useAppleLogin: () => ({
    signIn: jest.fn(),
    isPending: false,
    isError: false,
    errorCode: null,
  }),
}));
jest.mock('../../../lib/rememberedEmail', () => ({
  clearRememberedEmail: jest.fn(),
  getRememberedEmail: jest.fn(async () => null),
  setRememberedEmail: jest.fn(),
}));
jest.mock('../../../components/datetime/DatePicker', () => ({ DatePicker: () => null }));

type RenderNode = {
  children?: Array<RenderNode | string> | null;
  props?: { testID?: string };
};

function descendantTestIds(node: RenderNode | Array<RenderNode | string> | string | null): string[] {
  if (node === null || typeof node === 'string') return [];
  if (Array.isArray(node)) return node.flatMap(descendantTestIds);

  const current = node.props?.testID ? [node.props.testID] : [];
  return [...current, ...descendantTestIds(node.children ?? null)];
}

describe('auth legal disclosure placement', () => {
  it.each([
    ['login', <LoginScreen />, 'auth.login.account-switch'],
    ['register', <RegisterScreen />, 'auth.register.account-switch'],
  ])('keeps the single disclosure at the bottom of the %s screen', async (_name, screen, switchId) => {
    const rendered = await render(screen);
    expect(rendered.getAllByTestId('auth.oauth.legal-disclosure')).toHaveLength(1);

    const orderedIds = descendantTestIds(
      rendered.toJSON() as RenderNode | Array<RenderNode | string> | null,
    );
    expect(orderedIds.indexOf('auth.oauth.legal-disclosure')).toBeGreaterThan(
      orderedIds.indexOf(switchId),
    );
  });
});
