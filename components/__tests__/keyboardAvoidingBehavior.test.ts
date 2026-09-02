import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// GOTCHAS "写代码时碰到的细节差异" table: KeyboardAvoidingView takes
// behavior="padding" on iOS and undefined on Android, because Android already
// resizes the window for the keyboard.
//
// FloatingInputSheet shipped with behavior="height" on Android instead. Inside
// a transparent Modal under edge-to-edge, that view sizes itself from a frame
// it measures in one window against metrics from another, so each layout pass
// writes a height that provokes the next one. With justifyContent flex-end the
// sheet visibly oscillated between two positions every frame, while the user
// sat still — caught on a screen recording, not by any test, because nothing
// here asserted the rule the docs already stated.
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
