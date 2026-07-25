import { requireOptionalNativeModule } from 'expo';

import type { PosterviaAgeAssuranceNativeModule } from './PosterviaAgeAssurance.types';

export default requireOptionalNativeModule<PosterviaAgeAssuranceNativeModule>(
  'PosterviaAgeAssurance',
);
