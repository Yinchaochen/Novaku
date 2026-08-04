export type NativeGoogleSignInResult =
  | {
      status: 'success';
      idToken: string;
    }
  | {
      status: 'cancelled' | 'no_credential';
    }
  | {
      status: 'unavailable';
      reason?: string;
    };

export interface PosterviaGoogleSigninNativeModule {
  signInAsync(serverClientId: string): Promise<NativeGoogleSignInResult>;
  signOutAsync(): Promise<boolean>;
}
