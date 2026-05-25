// Dynamic Expo config. Inherits everything from app.json and only overrides
// what needs to come from environment variables — currently the Google Maps
// API key for native maps SDK injection on iOS / Android. Keeping the key
// in .env (gitignored) + EAS Secrets means it never lands in the public
// repo and rotation doesn't require a commit.
//
// One key, two env-var locations: react-native-google-places-autocomplete
// reads it from JS at runtime (requires the EXPO_PUBLIC_* prefix to be
// inlined into the JS bundle), and the native iOS / Android Maps SDK
// reads it from `ios.config.googleMapsApiKey` / `android.config.googleMaps.apiKey`
// at build time — Expo's BUILT-IN Maps autolink picks these up and emits the
// `react-native-google-maps` podspec that react-native-maps 1.20.x ships.
//
// IOS-LOGIN-107 (2026-05-25, Build 29): reverted from the 1.22+ config-plugin
// path (`react-native-maps/Google` subspec) back to the legacy Expo autolink
// because react-native-maps was downgraded from 1.27.2 -> 1.20.1 alongside
// `newArchEnabled: false` (1.27 hard-requires new arch; nuclear rollback to
// legacy bridge to escape the iOS 26 SBCrossfadeView splash freeze).

const fs = require('fs');
const path = require('path');

const appJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'app.json'), 'utf-8'),
);

module.exports = ({ config }) => {
  const base = config && Object.keys(config).length ? config : appJson.expo;
  const mapsKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY || // legacy name, still honoured
    '';

  return {
    ...base,
    ios: {
      ...(base.ios || {}),
      config: {
        ...((base.ios && base.ios.config) || {}),
        googleMapsApiKey: mapsKey,
      },
    },
    android: {
      ...(base.android || {}),
      config: {
        ...((base.android && base.android.config) || {}),
        googleMaps: {
          ...((base.android && base.android.config && base.android.config.googleMaps) || {}),
          apiKey: mapsKey,
        },
      },
    },
  };
};
