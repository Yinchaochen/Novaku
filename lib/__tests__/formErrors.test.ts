/**
 * Validation copy must never reach a user in English (D-072).
 *
 * A Chinese composer showed "Too small: expected string to have >=4
 * characters" under an empty title — Zod's own default, on screen, because
 * the schema gave no message and the screen printed `errors.title.message`
 * verbatim. It had happened once before and been fixed in one place
 * (`password_mismatch` in reset-password), which is exactly how a class of
 * bug survives: the instance gets fixed, the class does not.
 *
 * So the last two tests here are the point. They read the source of every
 * screen and fail on the *shape* of the mistake, not on the one instance of
 * it — a new schema without a code, or a new screen printing a raw message,
 * breaks the build rather than shipping.
 */

import fs from 'fs';
import path from 'path';

import { FIELD_ERROR_CODES, fieldErrorText, isFieldErrorCode } from '../formErrors';
import zh from '../../locales/zh/common.json';
import en from '../../locales/en/common.json';
import de from '../../locales/de/common.json';

const copy = zh.validation as Record<string, string>;

const APP_ROOT = path.resolve(__dirname, '..', '..');

function sourceFiles(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
        walk(full);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        out.push({ file: path.relative(APP_ROOT, full), text: fs.readFileSync(full, 'utf8') });
      }
    }
  };
  for (const dir of ['app', 'components', 'features']) {
    const full = path.join(APP_ROOT, dir);
    if (fs.existsSync(full)) walk(full);
  }
  return out;
}

describe('fieldErrorText', () => {
  it('translates a known code', () => {
    expect(fieldErrorText(copy as never, { message: 'title_too_short' })).toBe(
      copy.title_too_short,
    );
  });

  it('returns nothing when the field is fine', () => {
    expect(fieldErrorText(copy as never, undefined)).toBeNull();
    expect(fieldErrorText(copy as never, null)).toBeNull();
  });

  it('never leaks a raw library message', () => {
    // The exact string from the bug report. Whatever else changes, this must
    // not be what a reader sees.
    const leaked = 'Too small: expected string to have >=4 characters';
    expect(fieldErrorText(copy as never, { message: leaked })).toBe(copy.generic);
  });

  it('falls back for an unknown or empty code rather than showing it', () => {
    expect(fieldErrorText(copy as never, { message: 'not_a_code' })).toBe(copy.generic);
    expect(fieldErrorText(copy as never, { message: '' })).toBe(copy.generic);
    expect(fieldErrorText(copy as never, {})).toBe(copy.generic);
  });

  it('recognises its own codes', () => {
    expect(isFieldErrorCode('password_mismatch')).toBe(true);
    expect(isFieldErrorCode('Too small')).toBe(false);
    expect(isFieldErrorCode(undefined)).toBe(false);
  });
});

describe('validation copy', () => {
  it('every code has copy in every base language', () => {
    for (const locale of [zh, en, de]) {
      const block = (locale as { validation?: Record<string, string> }).validation;
      expect(block).toBeDefined();
      for (const code of [...FIELD_ERROR_CODES, 'generic']) {
        expect(typeof block![code]).toBe('string');
        expect(block![code].length).toBeGreaterThan(0);
      }
    }
  });

  it('has a generic fallback, because that is what unknown codes resolve to', () => {
    expect(typeof copy.generic).toBe('string');
  });
});

describe('the shape of the mistake cannot come back', () => {
  it('no screen renders a validation message directly', () => {
    // `{errors.x.message}` is how the English reached the screen. Every field
    // error goes through fieldErrorText, which cannot return raw text.
    const offenders: string[] = [];
    for (const { file, text } of sourceFiles()) {
      if (file.includes('ErrorBoundary')) continue; // developer-facing by design
      text.split('\n').forEach((line, index) => {
        if (/\{\s*errors[.[][^}]*\.message\s*\}/.test(line)) {
          offenders.push(`${file}:${index + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('every string validator on a form supplies a code', () => {
    // A schema without a message is half the bug; this catches that half at
    // the moment somebody writes it.
    const offenders: string[] = [];
    for (const { file, text } of sourceFiles()) {
      if (file.startsWith('lib')) continue;
      text.split('\n').forEach((line, index) => {
        const validators = line.match(/\.(min|max|email|url|regex)\(([^)]*)\)/g) ?? [];
        for (const call of validators) {
          if (!line.includes('z.') && !line.includes('zod')) continue;
          const args = call.slice(call.indexOf('(') + 1, -1);
          const hasCode = /['"][a-z_]+['"]/.test(args);
          if (!hasCode) offenders.push(`${file}:${index + 1} ${call}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('every code a schema emits has copy for it', () => {
    // A code with no translation would silently become the generic message.
    const used = new Set<string>();
    for (const { file, text } of sourceFiles()) {
      if (!text.includes('z.')) continue;
      for (const match of text.matchAll(/\.(?:min|max|email|url|regex)\([^)]*['"]([a-z_]+)['"]/g)) {
        used.add(match[1]);
      }
      for (const match of text.matchAll(/message:\s*['"]([a-z_]+)['"]/g)) {
        used.add(match[1]);
      }
    }
    const missing = [...used].filter((code) => !(code in copy));
    expect(missing).toEqual([]);
  });
});
