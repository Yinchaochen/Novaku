/**
 * One key per platform, and a fallback that makes the migration boring
 * (SEC-APP-MAPSKEY-01).
 *
 * The fallback is the whole design. Without it, the day the platform keys
 * appear is a day maps break for whichever platform was configured last.
 * With it, each platform switches over on its own the moment its key exists,
 * and a missing one is invisible rather than fatal.
 */

import { isPlatformScopedKey, resolveMapsKey, type MapsKeyEnv } from '../mapsKey';

const SHARED = 'shared-key';
const WEB = 'web-key';
const IOS = 'ios-key';
const ANDROID = 'android-key';

const ALL: MapsKeyEnv = {
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: SHARED,
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB: WEB,
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS: IOS,
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID: ANDROID,
};

describe('resolveMapsKey', () => {
  it.each([
    ['ios', IOS],
    ['android', ANDROID],
    ['web', WEB],
  ])('prefers the %s key when it exists', (platform, expected) => {
    expect(resolveMapsKey(ALL, platform)).toBe(expected);
  });

  it('falls back to the shared key while a platform has none', () => {
    // Today's state, and every intermediate state during the migration.
    expect(resolveMapsKey({ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: SHARED }, 'ios')).toBe(SHARED);
    expect(resolveMapsKey({ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: SHARED }, 'web')).toBe(SHARED);
  });

  it('lets one platform move over without disturbing the others', () => {
    const partway: MapsKeyEnv = {
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: SHARED,
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_WEB: WEB,
    };
    expect(resolveMapsKey(partway, 'web')).toBe(WEB);
    expect(resolveMapsKey(partway, 'ios')).toBe(SHARED);
    expect(resolveMapsKey(partway, 'android')).toBe(SHARED);
  });

  it('treats a blank or whitespace value as absent', () => {
    // EAS and .env both hand back empty strings for unset secrets; an empty
    // key would silently disable place search rather than fall back.
    const blank: MapsKeyEnv = {
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: SHARED,
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS: '   ',
    };
    expect(resolveMapsKey(blank, 'ios')).toBe(SHARED);
  });

  it('trims a stray newline rather than sending it to Google', () => {
    expect(resolveMapsKey({ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS: ` ${IOS}\n` }, 'ios')).toBe(IOS);
  });

  it('returns an empty string when nothing is configured at all', () => {
    expect(resolveMapsKey({}, 'ios')).toBe('');
  });

  it('an unknown platform is treated as web', () => {
    // macOS/windows targets would otherwise resolve to nothing.
    expect(resolveMapsKey(ALL, 'macos')).toBe(WEB);
  });
});

describe('isPlatformScopedKey', () => {
  it('reports which platforms have finished migrating', () => {
    const partway: MapsKeyEnv = {
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: SHARED,
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID: ANDROID,
    };
    expect(isPlatformScopedKey(partway, 'android')).toBe(true);
    expect(isPlatformScopedKey(partway, 'ios')).toBe(false);
  });

  it('is false when only the shared key exists', () => {
    expect(isPlatformScopedKey({ EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: SHARED }, 'web')).toBe(false);
  });
});

describe('no screen reads the maps key straight from the environment', () => {
  it('every read goes through the resolver', () => {
    // A direct process.env read is how a screen ends up on the shared key
    // forever, invisibly, after the platform keys exist.
    const fs = require('fs');
    const path = require('path');
    const APP_ROOT = path.resolve(__dirname, '..', '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
          walk(full);
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          const rel = path.relative(APP_ROOT, full);
          // The env modules and the resolver are where the read belongs.
          if (['lib/env.ts', 'lib/env.web.ts', 'lib/mapsKey.ts'].includes(rel.split(path.sep).join('/'))) {
            continue;
          }
          const text = fs.readFileSync(full, 'utf8');
          text.split('\n').forEach((line: string, index: number) => {
            if (/process\.env\.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY/.test(line)) {
              offenders.push(`${rel}:${index + 1}`);
            }
          });
        }
      }
    };
    for (const dir of ['app', 'components', 'features', 'lib']) {
      const full = path.join(APP_ROOT, dir);
      if (fs.existsSync(full)) walk(full);
    }
    expect(offenders).toEqual([]);
  });
});
