/**
 * The Plaza image limit and the sentence that states it (D-197).
 *
 * The limit went from 9 to 20, Instagram's carousel limit. The sentence used
 * to spell the old number out ("nine", "neun", 九) in every language, so the
 * number now travels through {count}. A language that lost the placeholder
 * would show the reader no number at all, or an old one.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import de from '../../locales/de/common.json';
import en from '../../locales/en/common.json';
import zh from '../../locales/zh/common.json';
import { MAX_POST_MEDIA_ITEMS } from '../postMediaLimit';

function longTailPhotoLimits(): [string, unknown][] {
  // Read as text, one language per line, like the brand check in
  // chineseAddressForm.test.ts: the file is megabytes of object literal.
  const source = readFileSync(
    join(__dirname, '..', '..', 'locales', 'all_translations.ts'),
    'utf8',
  );
  return source
    .split('\n')
    .map((line) => /^ {2}"([^"]+)": (\{.*\}),\s*$/s.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map(([, code, body]) => [code, JSON.parse(body).plaza?.photo_limit]);
}

it('lets one post carry as many pictures as an Instagram carousel', () => {
  expect(MAX_POST_MEDIA_ITEMS).toBe(20);
});

it('states the limit through {count} in every language', () => {
  const sentences: [string, unknown][] = [
    ['en', en.plaza.photo_limit],
    ['zh', zh.plaza.photo_limit],
    ['de', de.plaza.photo_limit],
    ...longTailPhotoLimits(),
  ];
  // Without this the check below passes on a file it failed to read.
  expect(sentences.length).toBeGreaterThan(100);

  const withoutOnePlaceholder = sentences.filter(
    ([, text]) => typeof text !== 'string' || text.split('{count}').length !== 2,
  );
  expect(withoutOnePlaceholder).toEqual([]);
});
