/**
 * Map-based location picker. Replaces the prior text-only Nominatim list
 * with a real interactive Google Map + autocomplete, modelled on the avatar
 * editors from Twitter / Instagram:
 *
 *  - Top: search box → Places API (New) autocomplete, biased to the map
 *    centre; tapping a suggestion fetches Place Details and drops a pin
 *  - Middle: MapView, animates + drops a Marker when a place is picked
 *  - Bottom: selected-place card + Confirm pill
 *
 * Returns a `CommunitySelectedPlaceInput` so the rest of the post composer
 * (which already understands that shape) doesn't need to change.
 *
 * Requires the dev client build — `react-native-maps` is a native module
 * and won't render under Expo Go. Importing it does not crash, but the
 * <MapView> renders as a grey rectangle until the dev client is installed.
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { useLanguage } from '../context/LanguageContext';
import {
  usePlaceAutocomplete,
  useFetchPlaceDetails,
  type PlacePrediction,
} from '../features/places/usePlaces';
import { buildPlaceUrl } from '../lib/maps';
import { mapsApiKey } from '../lib/mapsKey';
import { captureSentryMessage } from '../lib/sentry';
import { colors } from '../theme/tokens';
import type { CommunitySelectedPlaceInput } from '../features/community/useCommunity';

const GOOGLE_MAPS_API_KEY = mapsApiKey();

// IOS-LOGIN-113 diagnostic instrumentation. The 2026-05-27 iPhone syslog
// dump showed CoreLocation firing + user touches + zero GMSServices logs,
// proving Maps native SDK never inits on iOS. The chain we're tracing:
//   plaza.add_location.tap → plaza.suspense.fallback_visible
//   → LocationPicker.body_evaluated → LocationPicker.mounted
//   → LocationPicker.map_ready (MapView native bridge init)
// Whichever breadcrumb is missing from a Sentry session tells us where the
// chain breaks. Module-load-time breadcrumb fires before React even sees
// this component — if it never appears, `import 'react-native-maps'` itself
// is throwing (TurboModule registration on iOS 26 new arch).
captureSentryMessage('LocationPicker.module_loaded', {
  keyPresent: GOOGLE_MAPS_API_KEY.length > 0,
  keyLength: GOOGLE_MAPS_API_KEY.length,
  platform: Platform.OS,
  platformVersion: String(Platform.Version),
});
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Both platforms render Google Maps. Android only has PROVIDER_GOOGLE
// installed via our config plugin; iOS supports both Google + Apple Maps
// but we pick Google for visual consistency with Android.
const MAP_PROVIDER = PROVIDER_GOOGLE;

const DEFAULT_REGION: Region = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 100,
  longitudeDelta: 160,
};

const ZOOMED_DELTA = 0.01;

// D-107: Places runs on our backend now. The app used to call
// places.googleapis.com directly, which forced the key to ship in the bundle
// *and* to stay unrestricted — React Native's fetch cannot send the
// package/signature headers an Android app restriction checks. The key that
// remains in the app is the native Maps SDK one, which can be locked down.

// Autocomplete + the follow-up Details lookup bill as one "session" when they
// share a token; mint one per search, retire it after a pick.
function newSessionToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export interface LocationPickerProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialPlaceName?: string | null;
  /** Safe-area insets captured in the OUTER screen scope (outside the Modal).
   * iOS Modals live in a separate UIWindow whose insets don't reach
   * SafeAreaView reliably, so the header/footer would render under the status
   * bar / home indicator. Parent passes them in. See MOBILE_PLATFORM_GOTCHAS 坑#2. */
  outerInsets?: { top: number; bottom: number };
  onConfirm: (place: CommunitySelectedPlaceInput) => void;
  onCancel: () => void;
}

interface SelectedDraft {
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  placeId: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  openNow?: boolean | null;
}

export function LocationPicker({
  initialLatitude,
  initialLongitude,
  initialPlaceName,
  outerInsets,
  onConfirm,
  onCancel,
}: LocationPickerProps) {
  // Body-evaluation breadcrumb. If this fires but LocationPicker.mounted
  // doesn't, something threw during render between this line and React's
  // commit phase (e.g. a Hook ordering issue, a MapView prop validator
  // throwing, etc.).
  captureSentryMessage('LocationPicker.body_evaluated', {
    keyLength: GOOGLE_MAPS_API_KEY.length,
    platform: Platform.OS,
  });

  const { t } = useLanguage();
  const mapRef = useRef<MapView | null>(null);
  const [selected, setSelected] = useState<SelectedDraft | null>(null);
  const [locatingMe, setLocatingMe] = useState(false);
  const poiCacheRef = useRef<Map<string, SelectedDraft>>(new Map());

  // Mount breadcrumb. Confirms React committed the component to the tree.
  // If body_evaluated fires but mounted doesn't, a child component threw
  // during render and was caught by the ErrorBoundary above.
  useEffect(() => {
    captureSentryMessage('LocationPicker.mounted', {
      keyLength: GOOGLE_MAPS_API_KEY.length,
      platform: Platform.OS,
      platformVersion: String(Platform.Version),
    });
  }, []);

  const initialRegion: Region =
    initialLatitude != null && initialLongitude != null
      ? {
          latitude: initialLatitude,
          longitude: initialLongitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }
      : DEFAULT_REGION;

  const [query, setQuery] = useState('');
  const [sessionToken, setSessionToken] = useState<string>(newSessionToken);
  // Suppresses the dropdown after a pick, so choosing a suggestion does not
  // immediately re-search for the name it just wrote into the box.
  const [picked, setPicked] = useState(false);
  // Tracks the map's live centre so autocomplete biases to wherever the user
  // is looking; seeded from initialRegion, updated on every pan/zoom settle.
  const regionRef = useRef<Region>(initialRegion);
  const hasLocationBiasRef = useRef(initialLatitude != null && initialLongitude != null);

  const search = usePlaceAutocomplete(query, {
    sessionToken,
    near: hasLocationBiasRef.current
      ? { lat: regionRef.current.latitude, lon: regionRef.current.longitude }
      : null,
    enabled: !picked,
  });
  const detailsFetch = useFetchPlaceDetails();
  const predictions = search.data ?? [];
  const searching = search.isFetching;

  // A blank dropdown used to mean four different things — query too short, no
  // matches, the API refusing us, network down — so a broken search looked
  // exactly like a correct "nothing found" and the user just kept retyping.
  const outcome: 'idle' | 'results' | 'empty' | 'error' =
    picked || query.trim().length < 2
      ? 'idle'
      : search.isError
        ? 'error'
        : search.isFetching || search.data === undefined
          ? 'idle'
          : predictions.length > 0
            ? 'results'
            : 'empty';

  useEffect(() => {
    if (!search.isError) return;
    // Without this a dead key is invisible from the outside — the picker just
    // stops finding places and nobody is told, on either end.
    captureSentryMessage('LocationPicker.autocomplete_failed', {
      reason: search.error instanceof Error ? search.error.message : 'unknown',
      platform: Platform.OS,
    });
  }, [search.isError, search.error]);

  const animateTo = (lat: number, lng: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: ZOOMED_DELTA,
        longitudeDelta: ZOOMED_DELTA,
      },
      450,
    );
  };

  const handlePlacePick = (place: SelectedDraft) => {
    setSelected(place);
    animateTo(place.latitude, place.longitude);
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setPicked(false);
  };

  const handlePredictionPick = async (prediction: PlacePrediction) => {
    Keyboard.dismiss();
    setPicked(true);
    setQuery(prediction.main_text);
    try {
      const detail = await detailsFetch.mutateAsync({
        placeId: prediction.place_id,
        sessionToken,
      });
      handlePlacePick({
        name: detail.name || prediction.main_text,
        subtitle: detail.address || prediction.secondary_text,
        latitude: detail.latitude,
        longitude: detail.longitude,
        placeId: detail.place_id || prediction.place_id,
        rating: detail.rating ?? null,
        ratingCount: detail.rating_count ?? null,
        openNow: detail.open_now ?? null,
      });
    } catch {
      // Details lookup failed; box stays usable for a retry.
    } finally {
      // The session closes with the Details call — mint a fresh token so the
      // next search is billed as its own session.
      setSessionToken(newSessionToken());
    }
  };

  const handleUseMyLocation = async () => {
    setLocatingMe(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      hasLocationBiasRef.current = true;
      // Reverse-geocode to get a human-readable address.
      const [first] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const name =
        first?.name ||
        first?.street ||
        first?.city ||
        `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
      const subtitleParts = [first?.street, first?.city, first?.region, first?.country].filter(
        Boolean,
      );
      handlePlacePick({
        name: String(name),
        subtitle: subtitleParts.join(', '),
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        placeId: null,
      });
    } catch (_err) {
      // Permission denied or geolocation failed; silently no-op so the
      // user can still pick by search.
    } finally {
      setLocatingMe(false);
    }
  };

  const handleMapPress = async (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    // Reverse-geocode the tap so the card shows a useful label.
    let name = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    let subtitle = '';
    try {
      const [first] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (first) {
        name = first.name || first.street || first.city || name;
        const parts = [first.street, first.city, first.region, first.country].filter(Boolean);
        subtitle = parts.join(', ');
      }
    } catch {
      /* graceful fallthrough */
    }
    handlePlacePick({ name, subtitle, latitude, longitude, placeId: null });
  };

  // Tapping a labelled POI (e.g. Brandenburger Tor) fires onPoiClick, NOT
  // onPress — the POI consumes the normal tap. We drop the marker immediately,
  // then enrich it with name / address / rating / hours from Places Details.
  const handlePoiClick = async (event: {
    nativeEvent: { placeId?: string; name?: string; coordinate: { latitude: number; longitude: number } };
  }) => {
    const { placeId, name, coordinate } = event.nativeEvent;
    if (!placeId) {
      handleMapPress(event);
      return;
    }
    handlePlacePick({
      name: name ?? '',
      subtitle: '',
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      placeId,
    });
    const cached = poiCacheRef.current.get(placeId);
    if (cached) {
      setSelected(cached);
      return;
    }
    try {
      // No session token: a POI tap is a standalone Details lookup, not the
      // tail of an autocomplete session.
      const detail = await detailsFetch.mutateAsync({ placeId, sessionToken: '' });
      const draft: SelectedDraft = {
        name: detail.name || name || '',
        subtitle: detail.address || '',
        latitude: detail.latitude ?? coordinate.latitude,
        longitude: detail.longitude ?? coordinate.longitude,
        placeId: detail.place_id || placeId,
        rating: detail.rating ?? null,
        ratingCount: detail.rating_count ?? null,
        openNow: detail.open_now ?? null,
      };
      poiCacheRef.current.set(placeId, draft);
      setSelected(draft);
    } catch {
      // Keep the immediate marker; the card just won't show rating / hours.
    }
  };

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm({
      name: selected.name,
      subtitle: selected.subtitle,
      source_url: buildPlaceUrl(selected.name, selected.latitude, selected.longitude, selected.placeId),
      latitude: selected.latitude,
      longitude: selected.longitude,
    });
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        provider={MAP_PROVIDER}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onPress={handleMapPress}
        onPoiClick={handlePoiClick}
        onPanDrag={() => {
          hasLocationBiasRef.current = true;
        }}
        onRegionChangeComplete={(r) => {
          regionRef.current = r;
        }}
        onMapReady={() => {
          // Fires once native GMSMapView finishes its first layout. Presence
          // of this breadcrumb in Sentry proves Google Maps SDK booted. If
          // LocationPicker.mounted fires but map_ready never does → native
          // bridge is wired but GMSServices.init() is silently failing
          // (most likely cause: missing/invalid API key, or Application
          // restriction in GCP blocking the bundle ID).
          captureSentryMessage('LocationPicker.map_ready', {
            platform: Platform.OS,
          });
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {selected ? (
          <Marker
            coordinate={{ latitude: selected.latitude, longitude: selected.longitude }}
            title={selected.name}
            description={selected.subtitle}
            pinColor={colors.brandCoral}
          />
        ) : null}
      </MapView>

      {/* Header (back) + search */}
      <View style={[styles.headerLayer, { paddingTop: outerInsets?.top ?? 0 }]} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <Pressable
            onPress={onCancel}
            style={styles.iconButton}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color="#111" />
          </Pressable>
          <Pressable
            onPress={handleUseMyLocation}
            style={[styles.iconButton, locatingMe && { opacity: 0.6 }]}
            disabled={locatingMe}
            hitSlop={12}
            accessibilityLabel="Use my current location"
          >
            {locatingMe ? (
              <ActivityIndicator size="small" color={colors.brandCoral} />
            ) : (
              <Ionicons name="locate" size={22} color={colors.brandCoral} />
            )}
          </Pressable>
        </View>

        <View style={styles.searchWrapper}>
          <View style={styles.searchInputRow}>
            <Ionicons name="search" size={18} color="#999" style={{ marginLeft: 16 }} />
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder={t.plaza.location_picker_search_placeholder}
              placeholderTextColor="#999"
              style={styles.searchInput}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searching ? (
              <ActivityIndicator
                size="small"
                color={colors.brandCoral}
                style={{ marginRight: 16 }}
              />
            ) : query.length > 0 ? (
              <Pressable
                onPress={() => {
                  setQuery('');
                  setPicked(false);
                }}
                hitSlop={8}
                style={{ marginRight: 14 }}
              >
                <Ionicons name="close-circle" size={18} color="#BBB" />
              </Pressable>
            ) : null}
          </View>

          {predictions.length > 0 ? (
            <View style={styles.autocompleteList}>
              {predictions.map((p, i) => (
                <Pressable
                  key={p.place_id}
                  onPress={() => handlePredictionPick(p)}
                  style={[
                    styles.autocompleteRow,
                    i < predictions.length - 1 && styles.autocompleteRowBorder,
                  ]}
                >
                  <Text style={styles.predictionMain} numberOfLines={1}>
                    {p.main_text}
                  </Text>
                  {p.secondary_text ? (
                    <Text style={styles.predictionSecondary} numberOfLines={1}>
                      {p.secondary_text}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : outcome === 'empty' || outcome === 'error' ? (
            <View style={styles.autocompleteList}>
              <View style={styles.autocompleteRow}>
                <Text style={styles.statusText} testID="location-picker.status">
                  {outcome === 'error' ? t.plaza.location_picker_error : t.plaza.location_picker_empty}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      {/* Selected card + Confirm */}
      <View style={[styles.footerLayer, { paddingBottom: (outerInsets?.bottom ?? 0) + 8 }]} pointerEvents="box-none">
        {selected ? (
          <View style={styles.selectedCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName} numberOfLines={1}>
                {selected.name || initialPlaceName || ''}
              </Text>
              {selected.rating != null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 3 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#F5A623' }}>
                    {'★'} {selected.rating.toFixed(1)}
                  </Text>
                  {selected.ratingCount != null ? (
                    <Text style={{ fontSize: 12, color: '#888', marginLeft: 6 }}>
                      {t.plaza.location_picker_reviews.replace('{count}', String(selected.ratingCount))}
                    </Text>
                  ) : null}
                  {selected.openNow != null ? (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        marginLeft: 8,
                        color: selected.openNow ? '#2E9E5B' : '#D0463B',
                      }}
                    >
                      {selected.openNow ? t.plaza.location_picker_open : t.plaza.location_picker_closed}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {selected.subtitle ? (
                <Text style={styles.selectedSubtitle} numberOfLines={2}>
                  {selected.subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.hintCard}>
            <Ionicons name="information-circle-outline" size={20} color="#888" />
            <Text style={styles.hintText} numberOfLines={2}>
              {t.plaza.location_picker_hint}
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <Pressable
            onPress={onCancel}
            style={[styles.actionButton, styles.cancelButton]}
          >
            <Text style={styles.cancelText}>{t.common.cancel}</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            disabled={!selected}
            style={[
              styles.actionButton,
              styles.confirmButton,
              !selected && { opacity: 0.45 },
            ]}
          >
            <Text style={styles.confirmText}>{t.common.confirm}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E8E8E8',
  },
  headerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchWrapper: {
    marginTop: 12,
    marginHorizontal: 16,
    // Pull the autocomplete dropdown above the rest of the screen.
    zIndex: 10,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#111',
  },
  autocompleteList: {
    marginTop: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    maxHeight: SCREEN_HEIGHT * 0.45,
  },
  autocompleteRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  autocompleteRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  predictionMain: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  predictionSecondary: {
    marginTop: 2,
    fontSize: 13,
    color: '#7B7B7B',
  },
  statusText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7B7B7B',
  },
  footerLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  selectedName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  selectedSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B6B6B',
    lineHeight: 18,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    marginBottom: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#FF8F7E',
    shadowColor: colors.brandCoral,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default LocationPicker;
