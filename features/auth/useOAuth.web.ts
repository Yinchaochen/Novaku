export function useGoogleLogin() {
  return {
    request: false as const,
    signIn: async () => {},
    isPending: false,
    isError: false,
    error: null as unknown,
    errorCode: null as string | null,
  };
}

export function useAppleLogin() {
  return {
    signIn: async () => {},
    isPending: false,
    isError: false,
    error: null as unknown,
    errorCode: null as string | null,
  };
}

export async function resetOAuthProviderSelection(_provider: 'google' | 'apple') {}
