import type {
  NativeGoogleSignInResult,
  PosterviaGoogleSigninNativeModule,
} from './PosterviaGoogleSignin.types';

const webModule: PosterviaGoogleSigninNativeModule = {
  async signInAsync(): Promise<NativeGoogleSignInResult> {
    return { status: 'unavailable', reason: 'web' };
  },
  async signOutAsync(): Promise<boolean> {
    return false;
  },
};

export default webModule;
