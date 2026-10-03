import {
  Accuracy,
  getCurrentPositionAsync,
  getForegroundPermissionsAsync,
  getLastKnownPositionAsync,
} from 'expo-location';
import { Platform } from 'react-native';

import { approximateCityLookupCoordinates } from '../auth/cityLocation';

// A fix the phone already has is good enough to name a city; a fresh one is
// only worth a short wait, and publishing must not hang on either.
const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;
const FRESH_FIX_TIMEOUT_MS = 3000;

export type PostingLocation = { latitude: number; longitude: number };

/**
 * Where the device is as a post is published (D-153), rounded to two decimals
 * so the server can name the city and nothing finer. Null on the web, when
 * location was never granted (publishing never prompts for it), or when no
 * fix arrives in time: the server then reads the city from the text instead.
 */
export async function getPostingLocation(): Promise<PostingLocation | null> {
  if (Platform.OS === 'web') return null;
  try {
    const permission = await getForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    const position =
      (await getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })) ??
      (await Promise.race([
        getCurrentPositionAsync({ accuracy: Accuracy.Low }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), FRESH_FIX_TIMEOUT_MS)),
      ]));
    if (!position) return null;
    return approximateCityLookupCoordinates(position.coords);
  } catch {
    return null;
  }
}
