// Dynamic Expo config. Inherits everything from app.json and only overrides
// what needs to come from environment variables — currently the Google Maps
// API key for native maps SDK injection on iOS / Android. Keeping the key
// in .env (gitignored) + EAS Secrets means it never lands in the public
// repo and rotation doesn't require a commit.
//
// One key, two env-var locations: react-native-google-places-autocomplete
// reads it from JS at runtime (requires the EXPO_PUBLIC_* prefix to be
// inlined into the JS bundle), and the native iOS / Android Maps SDK
// reads it from the `react-native-maps` plugin's config block at build
// time. Same value, just exposed in both spots.
//
// IOS-LOGIN-106 (2026-05-25): switched from the legacy
// `ios.config.googleMapsApiKey` / `android.config.googleMaps.apiKey`
// injection (which triggers Expo's BUILT-IN Maps autolink emitting
// `pod 'react-native-google-maps'` — a podspec that react-native-maps
// 1.21+ no longer ships) to the lib's own 1.22+ config plugin (which
// emits the correct `pod 'react-native-maps/Google'` subspec). See
// https://github.com/react-native-maps/react-native-maps/issues/5710.
//
// To set locally: add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...` to .env,
// then restart `npx expo start --clear`.
// To set for EAS builds: `eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
// --value AIza... --scope project --environment development,preview,production`.

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

  // Inject the runtime key into the `react-native-maps` plugin block declared
  // in app.json (which has empty-string placeholders so the static config is
  // valid without secrets in git).
  const plugins = (base.plugins || []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'react-native-maps') {
      return [
        'react-native-maps',
        {
          ...(plugin[1] || {}),
          iosGoogleMapsApiKey: mapsKey,
          androidGoogleMapsApiKey: mapsKey,
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
