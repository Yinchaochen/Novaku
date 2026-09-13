/**
 * The Chinese UI addresses the reader as 您, everywhere, in both scripts.
 *
 * lisum's call, 2026-09-14. It had already been made for the translated half
 * (the backend's app/i18n/register.py tells the translator so on every call)
 * while the app's own 173 hand-written strings still said 你 in all 203 places
 * they addressed anyone. A reader does not know which strings came from a file
 * and which from a model, so the two halves disagreeing was visible as the app
 * changing how formally it spoke depending on the screen.
 *
 * Mechanical except for three: 您们 is not a word, so the two parties are 双方;
 * and "加你好友" does not take 您 without 为.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import zh from '../../locales/zh/common.json';

const INFORMAL = /你/;
/** 您们 / 您們 — the formal pronoun has no plural. */
const BAD_PLURAL = /您[们們]/;

function strings(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (node && typeof node === 'object') {
    return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
      strings(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}

describe('the Chinese UI speaks formally', () => {
  const zhStrings = strings(zh);

  it('has strings to check at all', () => {
    // Without this the two tests below pass on an empty list and say nothing.
    expect(zhStrings.length).toBeGreaterThan(400);
    expect(zhStrings.filter(([, s]) => s.includes('您')).length).toBeGreaterThan(100);
  });

  it('never addresses the reader as 你', () => {
    const informal = zhStrings.filter(([, s]) => INFORMAL.test(s));
    expect(informal).toEqual([]);
  });

  it('never pluralises the formal pronoun', () => {
    expect(zhStrings.filter(([, s]) => BAD_PLURAL.test(s))).toEqual([]);
  });
});

describe('the long tail carries the current brand', () => {
  it('has no string left calling the product Novaku', () => {
    // 526 of them across 105 locales, because the generator's prompt listed
    // Novaku as a proper noun to preserve. Only zh, en and de are written by
    // hand and only those three were clean.
    //
    // Read as text rather than imported: the file is ten megabytes of object
    // literal and the question is about its bytes, not its shape.
    const source = readFileSync(
      join(__dirname, '..', '..', 'locales', 'all_translations.ts'),
      'utf8',
    );
    expect(source.length).toBeGreaterThan(1_000_000);
    expect(source.includes('Novaku')).toBe(false);
    // The DPO mailbox is a different thing and stays: dpo@novaku.app is where
    // compliance mail actually lands, and it is lowercase, so the check above
    // does not reach it. Pinned so nobody "finishes the job" and breaks it.
    expect(source.includes('dpo@novaku.app')).toBe(true);
  });
});
