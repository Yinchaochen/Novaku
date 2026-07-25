import type {
  NativeAgeRangeResult,
  PosterviaAgeAssuranceNativeModule,
} from './PosterviaAgeAssurance.types';

const webModule: PosterviaAgeAssuranceNativeModule = {
  async requestAgeRangeAsync(): Promise<NativeAgeRangeResult> {
    return { status: 'unavailable' };
  },
};

export default webModule;
