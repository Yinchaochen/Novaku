// Web build of features/auth/useOAuth.ts. The native Google Sign-In SDK
// (@react-native-google-signin) and expo-apple-authentication don't run in a
// browser, so on web Metro resolves THIS stub instead. Web login goes through
// email + password; the OAuth buttons stay disabled (google.request === false)
// and these no-op signIn handlers never touch a native module.
//
// To enable real web OAuth later, implement these with expo-auth-session's
// browser flow (the backend /auth/google + /auth/apple endpoints are unchanged).

export interface OAuthRegistrationInput {
  birth_year: number;
  consents: {
    consent_type: string;
    granted: boolean;
    document_version?: string;
  }[];
}

export function useGoogleLogin() {
  return {
    // false → the login screen's `disabled={!google.request}` keeps the
    // Google button disabled on web instead of firing a native flow.
    request: false as const,
    signIn: async (_registration?: OAuthRegistrationInput) => {},
    isPending: false,
    isError: false,
    error: null as unknown,
  };
}

export function useAppleLogin() {
  return {
    signIn: async (_registration?: OAuthRegistrationInput) => {},
    isPending: false,
    isError: false,
    error: null as unknown,
  };
}
