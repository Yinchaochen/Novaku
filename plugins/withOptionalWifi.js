const { withAndroidManifest } = require('@expo/config-plugins');

// Play's release check for 1.5.8 flagged android.hardware.wifi as a required
// feature, which keeps the app off devices without Wi-Fi. We never declare it:
// @react-native-community/netinfo puts ACCESS_WIFI_STATE in its own manifest,
// and Android reads that permission as "Wi-Fi required" unless the app
// declares the feature itself. So the app declares it, as not required. No
// library declares the feature (checked in the 1.5.8 bundle), so nothing
// overrides this in the manifest merger.
const WIFI_FEATURE = 'android.hardware.wifi';

function declareWifiOptional(androidManifest) {
  const { application, ...manifest } = androidManifest.manifest;
  const features = (manifest['uses-feature'] ?? []).filter(
    (feature) => feature.$?.['android:name'] !== WIFI_FEATURE,
  );
  features.push({ $: { 'android:name': WIFI_FEATURE, 'android:required': 'false' } });
  // Rebuilt so <uses-feature> is written before <application> (xml2js keeps key order).
  androidManifest.manifest = { ...manifest, 'uses-feature': features, application };
  return androidManifest;
}

module.exports = function withOptionalWifi(config) {
  return withAndroidManifest(config, (cfg) => {
    cfg.modResults = declareWifiOptional(cfg.modResults);
    return cfg;
  });
};
module.exports.declareWifiOptional = declareWifiOptional;
module.exports.WIFI_FEATURE = WIFI_FEATURE;
