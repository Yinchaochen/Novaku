/**
 * What may be handed to the operating system (SEC-APP-URL-01).
 *
 * Most URLs reaching `openExternalUrl` come from server data: a post's
 * source_url, a task's link, a citation inside an AI answer. The old code
 * passed anything non-http straight to `Linking.openURL`, so the scheme was
 * whatever the data said it was. The last test here is the important one: it
 * reads every screen and fails when a new call site goes around the helper,
 * because that is how the hole reopens.
 */

import fs from 'fs';
import path from 'path';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

import { isSafeExternalUrl } from '../links';

const APP_ROOT = path.resolve(__dirname, '..', '..');

describe('isSafeExternalUrl', () => {
  it.each(['https://postervia.app', 'http://example.com/x', 'mailto:a@b.de', 'tel:+4930123'])(
    'allows %s',
    (url) => {
      expect(isSafeExternalUrl(url)).toBe(true);
    },
  );

  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'data:text/html,<script>alert(1)</script>',
    'intent://scan/#Intent;scheme=zxing;end',
    'postervia://billing/success',
  ])('refuses %s', (url) => {
    expect(isSafeExternalUrl(url)).toBe(false);
  });

  it('refuses nothing at all', () => {
    expect(isSafeExternalUrl(null)).toBe(false);
    expect(isSafeExternalUrl(undefined)).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
    expect(isSafeExternalUrl('   ')).toBe(false);
  });

  it('is not fooled by leading whitespace or casing', () => {
    expect(isSafeExternalUrl('  JavaScript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('  https://postervia.app  ')).toBe(true);
  });

  it('refuses a relative path, which has no business reaching the OS opener', () => {
    expect(isSafeExternalUrl('/p/123')).toBe(false);
  });
});

describe('no screen goes around the helper with server data', () => {
  it('server-supplied URLs are not passed to Linking.openURL directly', () => {
    // App-built URLs (store links, a wa.me number we assembled) are fine and
    // stay allowlisted here by file. Anything reading a `source_url`, a
    // citation or a task target must use openExternalUrl.
    const ALLOWED = [
      path.join('components', 'appUpdate', 'AppUpdateGate.tsx'), // storeUrl from validated config
      path.join('app', 'admin', 'buddy-applications.tsx'), // wa.me built from digits
      path.join('app', 'settings', 'data.tsx'), // our own R2 export link
      path.join('lib', 'links.ts'), // the helper itself
    ];

    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
          walk(full);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          const rel = path.relative(APP_ROOT, full);
          if (ALLOWED.includes(rel)) continue;
          const text = fs.readFileSync(full, 'utf8');
          text.split('\n').forEach((line, index) => {
            if (/Linking\.openURL\(/.test(line)) {
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
