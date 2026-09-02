// Dynamic Expo config. Inherits everything from app.json and only overrides
// what needs to come from environment variables — currently the Google Maps
// API key for native maps SDK injection on iOS / Android.
//
// IOS-LOGIN-108 (2026-05-25, Build 31): reverted Build 29's legacy
// ios.config.googleMapsApiKey path. SDK 54 + newArchEnabled OFF turned out
// to be unsupported (3 separate libs hard-require new arch: maps 1.27,
// reanimated 4, nativewind/css-interop's babel preset). Returning to
// new arch ON + maps 1.22+ config plugin path.

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

  // Per-platform keys, so each can carry the application restriction only its
  // own platform can satisfy (Android: package + SHA-1; iOS: bundle id). This
  // is the half that matters now: since D-107 no JS in the bundle calls a Maps
  // HTTP API, so lib/mapsKey.ts resolves a key nothing spends — the native SDK
  // configuration below is the only consumer left. Each falls back to the
  // shared key, so a platform switches over the moment its own key exists.
  const androidMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID || mapsKey;
  const iosMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS || mapsKey;

  // Inject the runtime key into the `react-native-maps` plugin block declared
  // in app.json (which has empty-string placeholders so the static config is
  // valid without secrets in git).
  const plugins = (base.plugins || []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'react-native-maps') {
      return [
        'react-native-maps',
        {
          ...(plugin[1] || {}),
          iosGoogleMapsApiKey: iosMapsKey,
          androidGoogleMapsApiKey: androidMapsKey,
        },
      ];
    }
    return plugin;
  });

  return {
    ...base,
    plugins,
  };
};
