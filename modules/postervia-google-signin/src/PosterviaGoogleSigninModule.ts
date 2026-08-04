import { requireOptionalNativeModule } from 'expo';

import type { PosterviaGoogleSigninNativeModule } from './PosterviaGoogleSignin.types';

export default requireOptionalNativeModule<PosterviaGoogleSigninNativeModule>(
  'PosterviaGoogleSignin',
);
