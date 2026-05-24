import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { env } from './env';
import { hydrateCurrentLocale } from './locale';
import * as secureStore from './secureStore';
import { addSentryBreadcrumb, reportToSentry } from './sentry';

export const API_BASE = env.EXPO_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Augment axios's per-request config to carry the request start timestamp
// from the request interceptor to the response interceptor so we can attach
// latency to breadcrumbs.
type TimedConfig = InternalAxiosRequestConfig & { _startedAt?: number };

api.interceptors.request.use(async (config) => {
  const token = await secureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const locale = await hydrateCurrentLocale();
  config.headers['Accept-Language'] = locale;
  (config as TimedConfig)._startedAt = Date.now();
  return config;
});

function shortUrl(url?: string): string {
  if (!url) return '(no_url)';
  return url.split('?')[0];
}

function durationMs(config?: AxiosRequestConfig): number | undefined {
  const startedAt = (config as TimedConfig | undefined)?._startedAt;
  return startedAt ? Date.now() - startedAt : undefined;
}

// 4xx that the UI already handles meaningfully and we don't want to flood
// Sentry with. Add to this list as we discover noise; do NOT broaden to
// "all 4xx" because real bugs hide there.
function isExpected4xx(status: number, url: string): boolean {
  if (status === 422) return true;
  if (status === 401 && url.includes('/auth/me')) return true;
  return false;
}

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await secureStore.getItemAsync('refresh_token');
  if (!refreshToken) throw new Error('no_refresh_token');

  const res = await api.post('/auth/refresh', { refresh_token: refreshToken });
  const { access_token, refresh_token: newRefresh } = res.data.data as {
    access_token: string;
    refresh_token: string;
  };
  await secureStore.setItemAsync('access_token', access_token);
  await secureStore.setItemAsync('refresh_token', newRefresh);
  return access_token;
}

api.interceptors.response.use(
  (response: AxiosResponse) => {
    addSentryBreadcrumb('api.response', {
      method: response.config.method,
      url: shortUrl(response.config.url),
      status: response.status,
      ms: durationMs(response.config),
    });
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = shortUrl(original?.url);
    const ms = durationMs(original);

    addSentryBreadcrumb('api.error', {
      method: original?.method,
      url,
      status,
      ms,
      code: error.code,
    });

    // Capture rules per audit gap FE-CRIT-4 + research pattern FE-2:
    //   * Report 5xx (real server problems)
    //   * Report network errors (no response received)
    //   * Report 401 on /auth/refresh (token-refresh-initial-failure = forced logout)
    //   * Skip the rest of 4xx (user/validation noise — would burn quota)
    if (!status) {
      reportToSentry(error, { url, status: 'network', code: error.code, ms });
    } else if (status >= 500) {
      reportToSentry(error, { url, status, ms });
    } else if (status === 401 && url.includes('/auth/refresh')) {
      reportToSentry(error, { url, status, ms, context: 'token_refresh_initial_401' });
    }
    // else: known/expected 4xx — breadcrumb already emitted above, no event capture

    if (!original || status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (original.url?.includes('/auth/refresh')) {
      await secureStore.deleteItemAsync('access_token');
      await secureStore.deleteItemAsync('refresh_token');
      return Promise.reject(error);
    }

    original._retry = true;

    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }

    try {
      const token = await refreshInFlight;
      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
      return api(original);
    } catch (err) {
      // Token refresh rotation failed — this kicks the user out involuntarily.
      // Always report, regardless of HTTP status, because the user didn't trigger this.
      reportToSentry(err, { context: 'token_refresh_rotation_failed', url });
      await secureStore.deleteItemAsync('access_token');
      await secureStore.deleteItemAsync('refresh_token');
      return Promise.reject(err);
    }
  }
);
