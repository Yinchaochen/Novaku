import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Marker: View, PROVIDER_GOOGLE: 'google' };
});

// @expo/vector-icons pulls expo-font -> expo-asset, which does not resolve
// under jest-expo here; the picker only uses icons decoratively.
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: View };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('../../lib/sentry', () => ({ captureSentryMessage: jest.fn() }));
jest.mock('../../lib/mapsKey', () => ({ mapsApiKey: () => 'test-key' }));

const mockAutocomplete = jest.fn();
jest.mock('../../features/places/usePlaces', () => ({
  usePlaceAutocomplete: (...args: unknown[]) => mockAutocomplete(...args),
  useFetchPlaceDetails: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({
    langCode: 'en',
    t: {
      common: { cancel: 'Cancel', confirm: 'Confirm' },
      plaza: {
        location_picker_search_placeholder: 'Search places...',
        location_picker_hint: 'hint',
        location_picker_empty: 'No matching places yet.',
        location_picker_error: 'Place search is unavailable right now.',
        location_picker_reviews: '{count} reviews',
        location_picker_open: 'Open',
        location_picker_closed: 'Closed',
      },
    },
  }),
}));

import { LocationPicker } from '../LocationPicker';

/** What usePlaceAutocomplete hands back, per query state. */
function hookState(over: Record<string, unknown> = {}) {
  return { data: undefined, isFetching: false, isError: false, error: null, ...over };
}

async function renderWith(state: Record<string, unknown>, query = 'Lenaustrasse') {
  mockAutocomplete.mockReturnValue(hookState(state));
  await render(<LocationPicker onConfirm={jest.fn()} onCancel={jest.fn()} />);
  await fireEvent.changeText(screen.getByPlaceholderText('Search places...'), query);
}

describe('LocationPicker search outcomes', () => {
  afterEach(() => mockAutocomplete.mockReset());

  it('says nothing matched when the search returns no rows', async () => {
    await renderWith({ data: [] });
    expect(screen.getByTestId('location-picker.status').props.children).toBe(
      'No matching places yet.',
    );
  });

  // The regression this file exists for. A rejected key answers 400/403 with a
  // body carrying no results; read as a result it is indistinguishable from
  // "your query matched nothing" — which is how an expired key stayed invisible
  // while people retyped the same address. The backend raises on a non-200
  // (tests/test_place_autocomplete.py); the picker must show that as its own
  // state rather than as an empty list.
  it('does not report a failed search as an empty result', async () => {
    await renderWith({ isError: true, error: new Error('http_503') });
    expect(screen.getByTestId('location-picker.status').props.children).toBe(
      'Place search is unavailable right now.',
    );
  });

  it('shows the suggestions when there are some', async () => {
    await renderWith({
      data: [{ place_id: 'abc', main_text: 'Lenaustraße', secondary_text: 'Berlin, Deutschland' }],
    });
    expect(screen.getByText('Lenaustraße')).toBeTruthy();
    expect(screen.queryByTestId('location-picker.status')).toBeNull();
  });

  it('stays silent while the query is too short to search', async () => {
    await renderWith({ data: [] }, 'L');
    expect(screen.queryByTestId('location-picker.status')).toBeNull();
  });

  it('stays silent while a search is still in flight', async () => {
    await renderWith({ isFetching: true });
    expect(screen.queryByTestId('location-picker.status')).toBeNull();
  });

  it('gives the autocomplete hook a session token', async () => {
    await renderWith({ data: [] });
    const calls = mockAutocomplete.mock.calls;
    const [, options] = calls[calls.length - 1] as [string, { sessionToken: string }];
    // Autocomplete and the Details call that follows bill as one session only
    // while they share this token.
    expect(typeof options.sessionToken).toBe('string');
    expect(options.sessionToken.length).toBeGreaterThan(0);
  });
});
