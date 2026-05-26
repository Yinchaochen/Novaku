import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { useLanguage } from '../../context/LanguageContext';
import {
  type PlaceSuggestion,
  usePlaceSearch,
  useReverseGeocode,
} from '../../features/places/usePlaces';
import { useAuthStore } from '../../store/authStore';

export type PickedPlace = PlaceSuggestion;

export interface PlacePickerProps {
  value: PickedPlace | null;
  onChange: (next: PickedPlace | null) => void;
  placeholder?: string;
}

const BERLIN: { lat: number; lon: number } = { lat: 52.52, lon: 13.405 };

/**
 * Inline HTML for the Leaflet map. Loads Leaflet from unpkg + tiles from
 * OpenStreetMap directly — no API key, no native deps. Bidirectional comm:
 *   - RN → WebView via injectJavaScript("setPin(lat, lon)") to programmatically
 *     move the pin when the user picks a search result.
 *   - WebView → RN via window.ReactNativeWebView.postMessage(JSON) when the
 *     user taps anywhere on the map (so we can reverse-geocode that point).
 */
function buildLeafletHtml(initialLat: number, initialLon: number, zoom: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html, body, #map { height: 100%; margin: 0; padding: 0; background: #FFF8F4; }</style>
</head>
<body>
<div id="map"></div>
<script>
  const map = L.map('map', { zoomControl: true }).setView([${initialLat}, ${initialLon}], ${zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);

  let marker = null;
  function setPin(lat, lon, label) {
    if (marker) { marker.remove(); marker = null; }
    marker = L.marker([lat, lon]).addTo(map);
    if (label) marker.bindPopup(label).openPopup();
    map.setView([lat, lon], Math.max(map.getZoom(), 15));
  }
  function clearPin() {
    if (marker) { marker.remove(); marker = null; }
  }
  window.__setPin = setPin;
  window.__clearPin = clearPin;

  map.on('click', (e) => {
    setPin(e.latlng.lat, e.latlng.lng);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'tap',
        lat: e.latlng.lat,
        lon: e.latlng.lng,
      }));
    }
  });

  // Notify RN when ready so it can push initial state.
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  }

  true;
</script>
</body>
</html>`;
}

export function PlacePicker({ value, onChange, placeholder }: PlacePickerProps) {
  const { t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<PickedPlace | null>(value);
  const webRef = useRef<WebView>(null);

  const near = useMemo(() => {
    if (user?.latitude != null && user?.longitude != null) {
      return { lat: user.latitude, lon: user.longitude };
    }
    return BERLIN;
  }, [user?.latitude, user?.longitude]);

  const searchQuery = usePlaceSearch(query, near, open);
  const reverse = useReverseGeocode();

  const initialCenter = value ?? { latitude: near.lat, longitude: near.lon };
  const html = useMemo(
    () => buildLeafletHtml(initialCenter.latitude, initialCenter.longitude, value ? 16 : 12),
    // Only generate once per modal open; don't rebuild on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setDraft(value);
    }
  }, [open, value]);

  const moveMapPin = (place: PickedPlace) => {
    const safeName = place.name.replace(/'/g, "\\'");
    webRef.current?.injectJavaScript(
      `window.__setPin && window.__setPin(${place.latitude}, ${place.longitude}, '${safeName}'); true;`,
    );
  };

  const onSelectResult = (place: PickedPlace) => {
    setDraft(place);
    setQuery('');
    moveMapPin(place);
  };

  const onWebViewMessage = async (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'ready' && value) {
        moveMapPin(value);
      } else if (msg.type === 'tap') {
        const lat = Number(msg.lat);
        const lon = Number(msg.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        try {
          const place = await reverse.mutateAsync({ lat, lon });
          setDraft(place);
        } catch {
          // Reverse failed — keep just the coordinates as a fallback.
          setDraft({
            name: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
            address: '',
            latitude: lat,
            longitude: lon,
          });
        }
      }
    } catch {
      // bad JSON — ignore
    }
  };

  const confirm = () => {
    if (!draft) return;
    onChange(draft);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
  };

  // Closed-state render: button or selected place card
  if (!value) {
    return (
      <>
        <Pressable
          onPress={() => setOpen(true)}
          className="flex-row items-center rounded-2xl bg-white px-4"
          style={{ height: 50, borderWidth: 1, borderColor: '#E5E7EB' }}
        >
          <Ionicons name="location-outline" size={18} color="#9CA3AF" />
          <Text className="ml-3 flex-1 text-[15px]" style={{ color: '#9CA3AF' }} numberOfLines={1}>
            {placeholder ?? t.places.search_button}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </Pressable>
        <PlacePickerModal
          open={open}
          onClose={() => setOpen(false)}
          html={html}
          query={query}
          setQuery={setQuery}
          searchResults={searchQuery.data ?? []}
          searchLoading={searchQuery.isFetching}
          draft={draft}
          onSelectResult={onSelectResult}
          onWebViewMessage={onWebViewMessage}
          onConfirm={confirm}
          webRef={webRef}
        />
      </>
    );
  }

  return (
    <>
      <View
        className="overflow-hidden rounded-2xl bg-white"
        style={{ borderWidth: 1, borderColor: '#E5E7EB' }}
      >
        <View className="flex-row items-center px-4 py-3">
          <Ionicons name="location" size={18} color="#F47C7C" />
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-semibold text-black" numberOfLines={1}>
              {value.name}
            </Text>
            {value.address ? (
              <Text className="mt-0.5 text-[12px] text-neutral-500" numberOfLines={2}>
                {value.address}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => setOpen(true)} hitSlop={6} className="ml-2">
            <Ionicons name="create-outline" size={18} color="#6B7280" />
          </Pressable>
          <Pressable onPress={clear} hitSlop={6} className="ml-3">
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        </View>
      </View>
      <PlacePickerModal
        open={open}
        onClose={() => setOpen(false)}
        html={html}
        query={query}
        setQuery={setQuery}
        searchResults={searchQuery.data ?? []}
        searchLoading={searchQuery.isFetching}
        draft={draft}
        onSelectResult={onSelectResult}
        onWebViewMessage={onWebViewMessage}
        onConfirm={confirm}
        webRef={webRef}
      />
    </>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  html: string;
  query: string;
  setQuery: (s: string) => void;
  searchResults: PickedPlace[];
  searchLoading: boolean;
  draft: PickedPlace | null;
  onSelectResult: (p: PickedPlace) => void;
  onWebViewMessage: (e: WebViewMessageEvent) => void;
  onConfirm: () => void;
  webRef: React.RefObject<WebView | null>;
}

function PlacePickerModal({
  open,
  onClose,
  html,
  query,
  setQuery,
  searchResults,
  searchLoading,
  draft,
  onSelectResult,
  onWebViewMessage,
  onConfirm,
  webRef,
}: ModalProps) {
  const { t } = useLanguage();
  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {/* IOS-LOGIN-112: PlacePicker is opened from inside Social's
          Create Meetup modal (also fullScreen). Without explicit
          presentationStyle, this would default to pageSheet on iOS 26 and
          freeze the entire Social tab via the stuck-modal-scene bug. */}
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-row items-center gap-3 border-b border-neutral-100 px-4 py-3">
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="chevron-back" size={26} color="#111111" />
            </Pressable>
            <View className="flex-1 flex-row items-center rounded-2xl bg-[#F5F5F7] px-3">
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t.places.search_placeholder}
                placeholderTextColor="#9CA3AF"
                className="flex-1 px-2 py-2 text-[15px] text-black"
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View className="flex-1">
            <WebView
              ref={webRef}
              originWhitelist={['*']}
              source={{ html }}
              onMessage={onWebViewMessage}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
            />

            {/* Search results overlay (only while typing). */}
            {query.trim().length >= 2 ? (
              <View
                className="absolute rounded-2xl bg-white"
                style={{
                  top: 8,
                  left: 12,
                  right: 12,
                  maxHeight: 280,
                  shadowColor: '#000',
                  shadowOpacity: 0.12,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 8,
                }}
              >
                {searchLoading && searchResults.length === 0 ? (
                  <View className="px-4 py-5">
                    <ActivityIndicator size="small" color="#F47C7C" />
                  </View>
                ) : searchResults.length === 0 ? (
                  <View className="px-4 py-4">
                    <Text className="text-[13px] text-neutral-500">{t.places.no_results}</Text>
                  </View>
                ) : (
                  <ScrollView keyboardShouldPersistTaps="handled">
                    {searchResults.map((place, i) => (
                      <Pressable
                        key={`${place.osm_id ?? i}-${place.latitude}`}
                        onPress={() => onSelectResult(place)}
                        className="flex-row items-start px-4 py-3"
                        style={
                          i < searchResults.length - 1
                            ? { borderBottomWidth: 1, borderBottomColor: '#F4F4F5' }
                            : undefined
                        }
                      >
                        <Ionicons name="location-outline" size={16} color="#9CA3AF" style={{ marginTop: 2 }} />
                        <View className="ml-3 flex-1">
                          <Text className="text-[14px] font-semibold text-black" numberOfLines={1}>
                            {place.name}
                          </Text>
                          {place.address ? (
                            <Text className="mt-0.5 text-[12px] text-neutral-500" numberOfLines={2}>
                              {place.address}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            ) : null}
          </View>

          {/* Bottom action bar */}
          <View
            className="border-t border-neutral-100 bg-white px-4 pt-3"
            style={{ paddingBottom: Platform.OS === 'ios' ? 24 : 16 }}
          >
            {draft ? (
              <View className="mb-3 flex-row items-center rounded-2xl bg-[#FFF1F2] px-3 py-2.5">
                <Ionicons name="location" size={16} color="#F47C7C" />
                <View className="ml-2 flex-1">
                  <Text className="text-[14px] font-semibold text-black" numberOfLines={1}>
                    {draft.name}
                  </Text>
                  {draft.address ? (
                    <Text className="text-[11.5px] text-neutral-500" numberOfLines={1}>
                      {draft.address}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <Text className="mb-3 text-center text-[12px] text-neutral-500">
                {t.places.tap_map_hint}
              </Text>
            )}
            <Pressable
              onPress={onConfirm}
              disabled={!draft}
              className="items-center justify-center rounded-full py-3.5"
              style={{ backgroundColor: draft ? '#F47C7C' : '#CBD5E1' }}
            >
              <Text className="text-[15px] font-bold text-white">{t.places.confirm_location}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
