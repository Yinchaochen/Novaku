import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
    PROVIDER_GOOGLE: 'google',
  };
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

async function renderPicker() {
  await render(<LocationPicker onConfirm={jest.fn()} onCancel={jest.fn()} />);
}

// Real timers: the 250ms debounce simply elapses inside waitFor, which keeps
// every state update inside React's act() scope.
async function search(text: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Search places...'), text);
}

describe('LocationPicker search outcomes', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('says nothing matched when the API answers with zero suggestions', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    await renderPicker();
    await search('Launestrasse');

    await waitFor(() => expect(screen.getByTestId('location-picker.status')).toBeTruthy());
    expect(screen.getByTestId('location-picker.status').props.children).toBe(
      'No matching places yet.',
    );
  });

  // The regression this file exists for: a rejected key answers 400/403 with a
  // JSON error body that has no `suggestions`. Read straight through, that is
  // indistinguishable from "your query matched nothing" — which is how an
  // expired key stayed invisible while users retyped the same address.
  it('does not report an API rejection as an empty result', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'API key expired.' } }),
    });
    await renderPicker();
    await search('Lenaustrasse');

    await waitFor(() => expect(screen.getByTestId('location-picker.status')).toBeTruthy());
    expect(screen.getByTestId('location-picker.status').props.children).toBe(
      'Place search is unavailable right now.',
    );
  });

  it('reports a thrown network error as an error, not as empty', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    await renderPicker();
    await search('Lenaustrasse');

    await waitFor(() => expect(screen.getByTestId('location-picker.status')).toBeTruthy());
    expect(screen.getByTestId('location-picker.status').props.children).toBe(
      'Place search is unavailable right now.',
    );
  });

  it('stays silent until the query is long enough to search', async () => {
    await renderPicker();
    await search('L');
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.queryByTestId('location-picker.status')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows the suggestions when the API returns some', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        suggestions: [
          {
            placePrediction: {
              placeId: 'abc',
              structuredFormat: {
                mainText: { text: 'Lenaustraße' },
                secondaryText: { text: 'Berlin, Deutschland' },
              },
            },
          },
        ],
      }),
    });
    await renderPicker();
    await search('Lenaustrasse');

    await waitFor(() => expect(screen.getByText('Lenaustraße')).toBeTruthy());
    expect(screen.queryByTestId('location-picker.status')).toBeNull();
  });
});
