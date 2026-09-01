/**
 * Every shipped locale answers for every key English answers for.
 *
 * German was registered as `deJson as Translations` — a cast asserting the file
 * is complete, which nothing checked. It was short sixteen keys, all
 * admin.moderation_*, so the moderation screen read `undefined` and called
 * .replace() on it. The generated long-tail locales never had this problem:
 * they are built with deepMerge(enJson, data) and fall back to English.
 *
 * The exception was exactly backwards. A generated file cannot drift; a
 * hand-edited one is the only kind that can.
 */

import enJson from '../../locales/en/common.json';
import { getTranslations } from '../i18n';

type Leaf = string;

function flatten(value: unknown, prefix = ''): Record<string, Leaf> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return prefix ? { [prefix]: String(value) } : {};
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, Leaf>>(
    (out, [key, child]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return { ...out, ...flatten(child, path) };
    },
    {},
  );
}

const ENGLISH_KEYS = Object.keys(flatten(enJson));

describe.each(['zh', 'de'])('%s answers for every English key', (locale) => {
  const resolved = flatten(getTranslations(locale));

  it('has no key missing', () => {
    const missing = ENGLISH_KEYS.filter((key) => !(key in resolved));
    expect(missing).toEqual([]);
  });

  it('resolves no key to undefined', () => {
    // The crash was not a missing key in the abstract — it was a value that
    // reached .replace(). A key present with an undefined value is the same bug.
    const undefinedValued = ENGLISH_KEYS.filter((key) => resolved[key] === 'undefined');
    expect(undefinedValued).toEqual([]);
  });
});

describe('the admin keys German was actually missing', () => {
  // Named rather than counted: a count passes again the moment somebody adds
  // one unrelated key, and these are the ones that crashed a screen.
  const CRASHED = [
    'admin.moderation_title',
    'admin.moderation_reason',
    'admin.moderation_reporter',
    'admin.moderation_action_approve',
    'admin.moderation_confirm_remove_title',
  ];

  it.each(CRASHED)('de resolves %s to a string', (key) => {
    const resolved = flatten(getTranslations('de'));
    expect(typeof resolved[key]).toBe('string');
    expect(resolved[key]).not.toBe('undefined');
  });
});
