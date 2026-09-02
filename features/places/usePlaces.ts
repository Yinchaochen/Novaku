import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useLanguage } from '../../context/LanguageContext';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

export interface PlaceSuggestion {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  osm_id?: string | null;
}

const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function usePlaceSearch(
  query: string,
  near?: { lat: number; lon: number } | null,
  enabled = true,
) {
  const user = useAuthStore((s) => s.user);
  const { langCode } = useLanguage();
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  return useQuery({
    queryKey: [
      'places',
      'search',
      debouncedQuery,
      near?.lat ?? null,
      near?.lon ?? null,
      langCode,
      user?.id,
    ],
    queryFn: async () => {
      const res = await api.get('/places/search', {
        params: {
          query: debouncedQuery,
          limit: 12,
          ...(near ? { lat: near.lat, lon: near.lon } : {}),
        },
      });
      return res.data.data.items as PlaceSuggestion[];
    },
    enabled: enabled && Boolean(user) && debouncedQuery.length >= 2,
    staleTime: 60_000,
  });
}

export function useReverseGeocode() {
  return useMutation({
    mutationFn: async (input: { lat: number; lon: number }) => {
      const res = await api.get('/places/reverse', {
        params: { lat: input.lat, lon: input.lon },
      });
      return res.data.data as PlaceSuggestion;
    },
  });
}

export interface PlacePrediction {
  place_id: string;
  main_text: string;
  secondary_text: string;
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number | null;
  rating_count?: number | null;
  open_now?: boolean | null;
}

// D-107: Google Places now runs on the backend, so no Places key ships in the
// app. `sessionToken` is minted by the caller and passed to both this and the
// details fetch — Google bills the pair as one session only while they match.
export function usePlaceAutocomplete(
  query: string,
  options: {
    sessionToken: string;
    near?: { lat: number; lon: number } | null;
    enabled?: boolean;
  },
) {
  const user = useAuthStore((s) => s.user);
  const { langCode } = useLanguage();
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const { sessionToken, near, enabled = true } = options;
  return useQuery({
    queryKey: ['places', 'autocomplete', debouncedQuery, near?.lat ?? null, near?.lon ?? null, langCode, user?.id],
    queryFn: async () => {
      const res = await api.get('/places/autocomplete', {
        params: {
          query: debouncedQuery,
          session_token: sessionToken,
          ...(near ? { lat: near.lat, lon: near.lon } : {}),
        },
      });
      return res.data.data.items as PlacePrediction[];
    },
    enabled: enabled && Boolean(user) && debouncedQuery.length >= 2,
    // A suggestion list goes stale fast and costs money to refetch; short
    // cache, no refetch on focus.
    staleTime: 30_000,
    retry: false,
  });
}

export function useFetchPlaceDetails() {
  const { langCode } = useLanguage();
  return useMutation({
    mutationFn: async (input: { placeId: string; sessionToken: string }) => {
      const res = await api.get(`/places/details/${encodeURIComponent(input.placeId)}`, {
        params: { session_token: input.sessionToken },
      });
      return res.data.data as PlaceDetails;
    },
    // langCode is read by the interceptor's Accept-Language; named here so the
    // dependency is visible rather than implicit.
    meta: { langCode },
  });
}
