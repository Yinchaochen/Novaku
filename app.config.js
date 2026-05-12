// Dynamic Expo config. Inherits everything from app.json and only overrides
// what needs to come from environment variables — currently the Google Maps
// API key for native maps SDK injection on iOS / Android. Keeping the key
// in .env (gitignored) + EAS Secrets means it never lands in the public
// repo and rotation doesn't require a commit.
//
// One key, two env-var locations: react-native-google-places-autocomplete
// reads it from JS at runtime (requires the EXPO_PUBLIC_* prefix to be
// inlined into the JS bundle), and the native iOS / Android Maps SDK
// reads it from this config file's ios.config / android.config block at
// build time. Same value, just exposed in both spots.
//
// To set locally: add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...` to .env,
// then restart `npx expo start --clear`.
// To set for EAS builds: `eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
// --value AIza... --scope project --environment development,preview,production`.

const fs = require('fs');
const path = require('path');

// app.json is the static source of truth. We spread it and add fields below.
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
        ...((base.ios || {}).config || {}),
        googleMapsApiKey: mapsKey,
      },
    },
    android: {
      ...(base.android || {}),
      config: {
        ...((base.android || {}).config || {}),
        googleMaps: {
          ...(((base.android || {}).config || {}).googleMaps || {}),
          apiKey: mapsKey,
        },
      },
    },
  };
};
