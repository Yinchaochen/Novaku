export type NativeAgeRangeResult =
  | {
      status: 'shared';
      lowerBound: number | null;
      upperBound: number | null;
    }
  | {
      status: 'not_shared' | 'verification_required' | 'unavailable';
    };

export interface PosterviaAgeAssuranceNativeModule {
  requestAgeRangeAsync(): Promise<NativeAgeRangeResult>;
}
