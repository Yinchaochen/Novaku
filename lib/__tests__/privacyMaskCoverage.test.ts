/**
 * Every screen that shows people masks them in feedback screenshots.
 *
 * The feedback screen promises users that names, profile photos, messages and
 * comments are covered before a screenshot leaves the phone (2026-10-15). That
 * promise is kept by PrivacyMask / PrivateText in these files; a refactor that
 * drops the import breaks it silently, so this test names them. A new screen
 * that shows people belongs on this list.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

const SCREENS_THAT_SHOW_PEOPLE = [
  'features/community/CommunityPostCard.tsx',
  'features/community/CommunityPostComments.tsx',
  'features/community/CommunityPostDetailModal.tsx',
  'app/notifications.tsx',
  'app/settings/blocked-users.tsx',
  'components/buddy/BuddyPostCard.tsx',
  'app/buddy/post/[id].tsx',
  'app/users/[id].tsx',
  'app/(tabs)/profile.tsx',
  'app/social/search.tsx',
  'app/(tabs)/social.tsx',
];

describe.each(SCREENS_THAT_SHOW_PEOPLE)('%s', (file) => {
  const source = readFileSync(join(ROOT, file), 'utf8');

  it('masks people in feedback screenshots', () => {
    expect(source).toMatch(/from '[./]+components\/PrivacyMask'|from '\.\.\/PrivacyMask'/);
    expect(source).toMatch(/<(PrivacyMask|PrivateText)\b/);
  });
});

it('masks every chat message, whatever its type', () => {
  const social = readFileSync(join(ROOT, 'app/(tabs)/social.tsx'), 'utf8');
  const calls = social.match(/bubbleContent\(\)/g) ?? [];
  const masked = social.match(/<PrivacyMask>\{bubbleContent\(\)\}<\/PrivacyMask>/g) ?? [];
  expect(calls.length).toBeGreaterThan(0);
  expect(masked.length).toBe(calls.length);
});
