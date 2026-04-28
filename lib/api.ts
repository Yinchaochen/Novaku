import axios from 'axios';

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

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Refresh endpoint itself failed — clear session
    if (original.url?.includes('/auth/refresh')) {
      await secureStore.deleteItemAsync('access_token');
      await secureStore.deleteItemAsync('refresh_token');
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = await secureStore.getItemAsync('refresh_token');
    if (!refreshToken) {
      isRefreshing = false;
      return Promise.reject(error);
    }

    try {
      const res = await api.post('/auth/refresh', { refresh_token: refreshToken });
      const { access_token, refresh_token: newRefresh } = res.data.data as {
        access_token: string;
        refresh_token: string;
      };
      await secureStore.setItemAsync('access_token', access_token);
      await secureStore.setItemAsync('refresh_token', newRefresh);
      processQueue(null, access_token);
      original.headers.Authorization = `Bearer ${access_token}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      await secureStore.deleteItemAsync('access_token');
      await secureStore.deleteItemAsync('refresh_token');
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);
