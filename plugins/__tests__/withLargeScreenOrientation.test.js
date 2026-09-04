const {
  stripOrientationLocks,
  lockCompactWidthsToPortrait,
  CODE_SCANNER_DELEGATE_ACTIVITY,
} = require('../withLargeScreenOrientation');

// Shape of what expo prebuild hands to withAndroidManifest after its own
// withOrientation plugin has written the portrait lock.
function manifestWithPortraitLock() {
  return {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      application: [
        {
          $: { 'android:name': '.MainApplication' },
          activity: [
            {
              $: {
                'android:name': '.MainActivity',
                'android:exported': 'true',
                'android:screenOrientation': 'portrait',
              },
              'intent-filter': [
                {
                  action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
                  category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
                },
              ],
            },
          ],
        },
      ],
    },
  };
}

const TEMPLATE_MAIN_ACTIVITY = `package app.novaku.mobile
import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // setTheme(R.style.AppTheme);
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
  }
}
`;

describe('stripOrientationLocks', () => {
  it('drops the manifest lock on MainActivity but keeps its other attributes', () => {
    const result = stripOrientationLocks(manifestWithPortraitLock());
    const main = result.manifest.application[0].activity[0];
    expect(main.$['android:screenOrientation']).toBeUndefined();
    expect(main.$['android:exported']).toBe('true');
    expect(main['intent-filter']).toHaveLength(1);
  });

  it('tells the manifest merger to drop the code-scanner delegate lock, once', () => {
    const result = stripOrientationLocks(stripOrientationLocks(manifestWithPortraitLock()));
    expect(result.manifest.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
    const overrides = result.manifest.application[0].activity.filter(
      (activity) => activity.$['android:name'] === CODE_SCANNER_DELEGATE_ACTIVITY,
    );
    expect(overrides).toHaveLength(1);
    expect(overrides[0].$['tools:remove']).toBe('android:screenOrientation');
    expect(overrides[0].$['android:screenOrientation']).toBeUndefined();
  });
});

describe('lockCompactWidthsToPortrait', () => {
  it('locks portrait at runtime only below 600dp, before super.onCreate', () => {
    const result = lockCompactWidthsToPortrait(TEMPLATE_MAIN_ACTIVITY);
    expect(result).toContain('import android.content.pm.ActivityInfo');
    const lock = result.indexOf('smallestScreenWidthDp < 600');
    const superCall = result.indexOf('super.onCreate(null)');
    expect(lock).toBeGreaterThan(-1);
    expect(lock).toBeLessThan(superCall);
    expect(result).toContain('requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT');
  });

  it('is idempotent across repeated prebuilds', () => {
    const once = lockCompactWidthsToPortrait(TEMPLATE_MAIN_ACTIVITY);
    const twice = lockCompactWidthsToPortrait(once);
    expect(twice).toBe(once);
    expect(twice.match(/import android\.content\.pm\.ActivityInfo/g)).toHaveLength(1);
    expect(twice.match(/smallestScreenWidthDp/g)).toHaveLength(1);
  });
});
