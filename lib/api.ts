import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { hydrateCurrentLocale } from './locale';
import * as secureStore from './secureStore';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await secureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const locale = await hydrateCurrentLocale();
  config.headers['Accept-Language'] = locale;
  return config;
});

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
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!original || error.response?.status !== 401 || original._retry) {
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
      await secureStore.deleteItemAsync('access_token');
      await secureStore.deleteItemAsync('refresh_token');
      return Promise.reject(err);
    }
  }
);
