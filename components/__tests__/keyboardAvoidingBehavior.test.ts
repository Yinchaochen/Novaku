import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// GOTCHAS "写代码时碰到的细节差异" table: KeyboardAvoidingView takes
// behavior="padding" on iOS and undefined on Android.
//
// The reason stated here used to be "Android already resizes the window for
// the keyboard". Under edge-to-edge (SDK 54) it does not, and a Modal has its
// own window on top of that — D-127 caught a sheet spending 52% of a typing
// session underneath the keyboard. Android screens subtract the keyboard
// themselves via hooks/useKeyboardHeight; the rule below is unchanged, because
// the behaviors this view offers Android are still the wrong instrument:
// "height" sizes itself from a frame it measures in one window against metrics
// from another, so each layout pass writes a height that provokes the next one
// — with justifyContent flex-end that oscillated every frame while the user
// sat still, caught on a screen recording rather than by any test.
//
// This walks the source instead of one component: the invariant is repo-wide,
// and the next person to reach for "height" should turn this red.

const ROOTS = ['app', 'components', 'features'];
const SKIP = new Set(['node_modules', '__tests__', '.expo', 'dist']);

function sourceFiles(dir: string): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(sourceFiles(full));
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

describe('KeyboardAvoidingView behavior', () => {
  const files = ROOTS.flatMap((r) => sourceFiles(join(__dirname, '..', '..', r)));

  it('finds the KeyboardAvoidingView call sites it means to guard', () => {
    const withKav = files.filter((f) => readFileSync(f, 'utf8').includes('<KeyboardAvoidingView'));
    expect(withKav.length).toBeGreaterThanOrEqual(6);
  });

  it('never asks Android for a behavior', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      if (!src.includes('<KeyboardAvoidingView')) continue;
      for (const [, value] of src.matchAll(/behavior=\{([^}]*)\}/g)) {
        const flat = value.replace(/\s+/g, ' ').trim();
        // The only sanctioned shape: iOS gets padding, Android gets undefined.
        if (!/^Platform\.OS === 'ios' \? 'padding' : undefined$/.test(flat)) {
          offenders.push(`${file.replace(/\\/g, '/').split('/novaku-app/')[1]}: behavior={${flat}}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
