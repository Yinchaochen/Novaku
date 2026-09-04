const { withAndroidManifest, withMainActivity, AndroidConfig } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

// Play's large-screen check (D-112) flags every manifest orientation lock, and
// Android 16 ignores them on large screens anyway. So the lock leaves the
// manifest and moves to runtime, where it only applies to compact widths:
// phones stay portrait, tablets and unfolded foldables rotate freely.
//
// The second lock Play found is not ours: expo-camera pulls in Google's code
// scanner, whose delegate activity declares portrait in its own manifest. The
// merger is told to drop that attribute; the activity itself stays.
const COMPACT_WIDTH_DP = 600;
const CODE_SCANNER_DELEGATE_ACTIVITY =
  'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';
const TAG = 'postervia-large-screen-orientation';

function stripOrientationLocks(androidManifest) {
  AndroidConfig.Manifest.ensureToolsAvailable(androidManifest);
  const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);
  delete mainActivity.$['android:screenOrientation'];

  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  application.activity = application.activity ?? [];
  const alreadyOverridden = application.activity.some(
    (activity) => activity.$?.['android:name'] === CODE_SCANNER_DELEGATE_ACTIVITY,
  );
  if (!alreadyOverridden) {
    application.activity.push({
      $: {
        'android:name': CODE_SCANNER_DELEGATE_ACTIVITY,
        'tools:remove': 'android:screenOrientation',
      },
    });
  }
  return androidManifest;
}

function lockCompactWidthsToPortrait(mainActivitySource) {
  const withImport = AndroidConfig.CodeMod.addImports(
    mainActivitySource,
    ['android.content.pm.ActivityInfo'],
    false,
  );
  return mergeContents({
    src: withImport,
    newSrc: [
      '    // D-112: phones stay portrait; large screens rotate (Android 16 ignores manifest locks there).',
      `    if (resources.configuration.smallestScreenWidthDp < ${COMPACT_WIDTH_DP}) {`,
      '      requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT',
      '    }',
    ].join('\n'),
    anchor: /super\.onCreate\(null\)/,
    offset: 0,
    tag: TAG,
    comment: '//',
  }).contents;
}

module.exports = function withLargeScreenOrientation(config) {
  config = withAndroidManifest(config, (cfg) => {
    cfg.modResults = stripOrientationLocks(cfg.modResults);
    return cfg;
  });
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error(`[${TAG}] MainActivity is ${cfg.modResults.language}; only Kotlin is handled.`);
    }
    cfg.modResults.contents = lockCompactWidthsToPortrait(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.stripOrientationLocks = stripOrientationLocks;
module.exports.lockCompactWidthsToPortrait = lockCompactWidthsToPortrait;
module.exports.CODE_SCANNER_DELEGATE_ACTIVITY = CODE_SCANNER_DELEGATE_ACTIVITY;
