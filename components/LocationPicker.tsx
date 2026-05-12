/**
 * Map-based location picker. Replaces the prior text-only Nominatim list
 * with a real interactive Google Map + autocomplete, modelled on the avatar
 * editors from Twitter / Instagram:
 *
 *  - Top: GooglePlacesAutocomplete search box (overlays the map)
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

import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme/tokens';
import type { CommunitySelectedPlaceInput } from '../features/community/useCommunity';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
const SCREEN_HEIGHT = Dimensions.get('window').height;

// Map providers per platform. Android only has PROVIDER_GOOGLE installed via
// our config plugin; iOS supports both Google + Apple Maps, but Google keeps
// the look + the place icons consistent across platforms.
const MAP_PROVIDER = Platform.select({ android: PROVIDER_GOOGLE, ios: PROVIDER_GOOGLE });

const DEFAULT_REGION: Region = {
  // Brandenburg Gate — a sensible fallback when we have no user city yet.
  latitude: 52.5163,
  longitude: 13.3777,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

const ZOOMED_DELTA = 0.01;

export interface LocationPickerProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  initialPlaceName?: string | null;
  onConfirm: (place: CommunitySelectedPlaceInput) => void;
  onCancel: () => void;
}

interface SelectedDraft {
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  placeId: string | null;
}

function placeUrl(placeId: string | null, lat: number, lng: number): string {
  // Stable URL we can store as the place's source_url. Prefer the Google
  // Maps place_id form when we have it (survives renames and address
  // changes); fall back to a coords-only URL otherwise.
  if (placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function LocationPicker({
  initialLatitude,
  initialLongitude,
  initialPlaceName,
  onConfirm,
  onCancel,
}: LocationPickerProps) {
  const { t } = useLanguage();
  const mapRef = useRef<MapView | null>(null);
  const [selected, setSelected] = useState<SelectedDraft | null>(null);
  const [locatingMe, setLocatingMe] = useState(false);

  const initialRegion: Region =
    initialLatitude != null && initialLongitude != null
      ? {
          latitude: initialLatitude,
          longitude: initialLongitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }
      : DEFAULT_REGION;

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

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm({
      name: selected.name,
      subtitle: selected.subtitle,
      source_url: placeUrl(selected.placeId, selected.latitude, selected.longitude),
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
      <SafeAreaView edges={['top']} style={styles.headerLayer} pointerEvents="box-none">
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
          <GooglePlacesAutocomplete
            placeholder={t.plaza.location_picker_search_placeholder}
            fetchDetails
            debounce={250}
            minLength={2}
            keyboardShouldPersistTaps="handled"
            // Hide the powered-by-Google row (it duplicates the marker
            // attribution that's already on the map). Required by ToS only
            // if maps tiles aren't visible; we always show maps, so OK.
            enablePoweredByContainer={false}
            query={{
              key: GOOGLE_MAPS_API_KEY,
              language: 'en',
            }}
            onPress={(data, details) => {
              if (!details || !details.geometry) return;
              const { lat, lng } = details.geometry.location;
              const name =
                details.name ||
                data.structured_formatting?.main_text ||
                data.description ||
                '';
              const subtitle =
                details.formatted_address ||
                data.structured_formatting?.secondary_text ||
                '';
              handlePlacePick({
                name,
                subtitle,
                latitude: lat,
                longitude: lng,
                placeId: details.place_id || data.place_id || null,
              });
            }}
            styles={{
              container: styles.autocompleteContainer,
              textInputContainer: styles.autocompleteInputContainer,
              textInput: styles.autocompleteInput,
              listView: styles.autocompleteList,
              row: styles.autocompleteRow,
              separator: styles.autocompleteSeparator,
              description: styles.autocompleteDescription,
            }}
          />
        </View>
      </SafeAreaView>

      {/* Selected card + Confirm */}
      <SafeAreaView edges={['bottom']} style={styles.footerLayer} pointerEvents="box-none">
        {selected ? (
          <View style={styles.selectedCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName} numberOfLines={1}>
                {selected.name || initialPlaceName || ''}
              </Text>
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
      </SafeAreaView>
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
  autocompleteContainer: {
    flex: 0,
  },
  autocompleteInputContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  autocompleteInput: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#111',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
  autocompleteSeparator: {
    height: 1,
    backgroundColor: '#EFEFEF',
  },
  autocompleteDescription: {
    fontSize: 15,
    color: '#1A1A1A',
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
