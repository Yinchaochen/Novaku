import { useQuery } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { type AppReleaseInfo, installedAppVersion } from '../../lib/appVersion';
import { api } from '../../lib/api';

/**
 * What the stores currently offer, plus the release notes for this build.
 * Public endpoint: a build blocked by the minimum version may not be able to
 * log in, so the answer must not require a session.
 */
export function useAppRelease() {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const version = installedAppVersion();

  return useQuery<AppReleaseInfo>({
    queryKey: ['app', 'release', platform, version],
    queryFn: async () => {
      const res = await api.get('/app/release', { params: { platform, version } });
      return res.data.data as AppReleaseInfo;
    },
    enabled: Platform.OS === 'ios' || Platform.OS === 'android',
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}
