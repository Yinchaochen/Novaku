const { XML } = require('@expo/config-plugins');
const { declareWifiOptional, WIFI_FEATURE } = require('../withOptionalWifi');

const OPTIONAL_WIFI = { $: { 'android:name': WIFI_FEATURE, 'android:required': 'false' } };

// Shape of what expo prebuild hands to withAndroidManifest: the template's
// permissions, queries and application, and no <uses-feature> of its own.
function templateManifest() {
  return {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      'uses-permission': [{ $: { 'android:name': 'android.permission.INTERNET' } }],
      queries: [{ package: [{ $: { 'android:name': 'com.instagram.android' } }] }],
      application: [{ $: { 'android:name': '.MainApplication' } }],
    },
  };
}

describe('declareWifiOptional', () => {
  it('writes the optional Wi-Fi feature before <application>', () => {
    const xml = XML.format(declareWifiOptional(templateManifest()));
    const feature = xml.indexOf(
      '<uses-feature android:name="android.hardware.wifi" android:required="false"/>',
    );
    expect(feature).toBeGreaterThan(-1);
    expect(feature).toBeLessThan(xml.indexOf('<application'));
  });

  it('keeps the rest of the manifest', () => {
    const { manifest } = declareWifiOptional(templateManifest());
    expect(manifest['uses-feature']).toEqual([OPTIONAL_WIFI]);
    expect(manifest['uses-permission']).toEqual(templateManifest().manifest['uses-permission']);
    expect(manifest.queries).toEqual(templateManifest().manifest.queries);
    expect(manifest.application).toEqual(templateManifest().manifest.application);
  });

  it('leaves one optional declaration across repeated prebuilds, even over a required one', () => {
    const glEs = { $: { 'android:glEsVersion': '0x00020000', 'android:required': 'true' } };
    const input = templateManifest();
    input.manifest['uses-feature'] = [
      glEs,
      { $: { 'android:name': WIFI_FEATURE, 'android:required': 'true' } },
    ];
    const { manifest } = declareWifiOptional(declareWifiOptional(input));
    expect(manifest['uses-feature']).toEqual([glEs, OPTIONAL_WIFI]);
  });
});
