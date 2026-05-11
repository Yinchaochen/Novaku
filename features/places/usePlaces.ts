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
