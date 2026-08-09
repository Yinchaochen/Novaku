import Constants from 'expo-constants';

export interface ReleaseNotes {
  version: string;
  title: string;
  highlights: string[];
}

export interface AppReleaseInfo {
  platform: 'ios' | 'android';
  latest_version: string;
  minimum_supported_version: string | null;
  store_url: string;
  current_notes: ReleaseNotes | null;
  latest_notes: ReleaseNotes | null;
}

export interface AppUpdateMemory {
  lastSeenVersion: string | null;
  snoozedVersion: string | null;
  snoozedAt: number | null;
}

export type AppUpdateDecision =
  | { kind: 'none' }
  /** Version changed but there is nothing to show — record it and stay quiet. */
  | { kind: 'seen_only' }
  | { kind: 'whats_new'; notes: ReleaseNotes }
  | { kind: 'available'; version: string; notes: ReleaseNotes | null; storeUrl: string }
  | { kind: 'forced'; version: string; notes: ReleaseNotes | null; storeUrl: string };

export const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export function installedAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

function parseVersion(value: string | null | undefined): number[] | null {
  if (!value) return null;
  const parts = value.trim().split('.');
  if (parts.length === 0 || parts.length > 4) return null;
  const numbers = parts.map((part) => (/^\d+$/.test(part) ? Number(part) : NaN));
  return numbers.some(Number.isNaN) ? null : numbers;
}

/** -1 / 0 / 1, or null when either side is not a plain numeric version. */
export function compareVersions(left: string | null, right: string | null): number | null {
  const a = parseVersion(left);
  const b = parseVersion(right);
  if (!a || !b) return null;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * What the app should show about updates, as one pure decision.
 *
 * Order matters: a blocked version must never be able to reach the dismissible
 * prompts. An unparseable version compares to null and therefore prompts
 * nothing — we would rather stay silent than nag or block on a version string
 * we do not understand.
 */
export function decideAppUpdate(input: {
  installed: string;
  release: AppReleaseInfo | null | undefined;
  memory: AppUpdateMemory;
  now: number;
}): AppUpdateDecision {
  const { installed, release, memory, now } = input;
  if (!release) return { kind: 'none' };

  if (
    release.minimum_supported_version &&
    compareVersions(installed, release.minimum_supported_version) === -1
  ) {
    return {
      kind: 'forced',
      version: release.latest_version,
      notes: release.latest_notes,
      storeUrl: release.store_url,
    };
  }

  // A first install has no previous version to have upgraded from, so it gets
  // onboarding, not a changelog.
  if (memory.lastSeenVersion !== null && memory.lastSeenVersion !== installed) {
    return release.current_notes
      ? { kind: 'whats_new', notes: release.current_notes }
      : { kind: 'seen_only' };
  }

  if (compareVersions(installed, release.latest_version) === -1) {
    const snoozed =
      memory.snoozedVersion === release.latest_version &&
      memory.snoozedAt !== null &&
      now - memory.snoozedAt < SNOOZE_MS;
    if (!snoozed) {
      return {
        kind: 'available',
        version: release.latest_version,
        notes: release.latest_notes,
        storeUrl: release.store_url,
      };
    }
  }

  return { kind: 'none' };
}
