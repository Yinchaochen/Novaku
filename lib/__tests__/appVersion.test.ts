import {
  type AppReleaseInfo,
  type AppUpdateMemory,
  SNOOZE_MS,
  compareVersions,
  decideAppUpdate,
} from '../appVersion';

const NOTES = { version: '1.2.0', title: 'Video posts', highlights: ['Share a video'] };

function release(overrides: Partial<AppReleaseInfo> = {}): AppReleaseInfo {
  return {
    platform: 'ios',
    latest_version: '1.2.0',
    minimum_supported_version: null,
    store_url: 'https://apps.apple.com/app/id6768678629',
    current_notes: null,
    latest_notes: NOTES,
    ...overrides,
  };
}

function memory(overrides: Partial<AppUpdateMemory> = {}): AppUpdateMemory {
  return { lastSeenVersion: null, snoozedVersion: null, snoozedAt: null, ...overrides };
}

const NOW = 1_760_000_000_000;

describe('compareVersions', () => {
  it('pads missing segments and compares numerically', () => {
    expect(compareVersions('1.2.0', '1.2')).toBe(0);
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.1.5', '1.2.0')).toBe(-1);
  });

  it('returns null for versions it cannot parse', () => {
    expect(compareVersions('1.2.0-beta', '1.2.0')).toBeNull();
    expect(compareVersions(null, '1.2.0')).toBeNull();
  });
});

describe('decideAppUpdate', () => {
  it('stays silent without release data', () => {
    expect(
      decideAppUpdate({ installed: '1.1.5', release: undefined, memory: memory(), now: NOW }),
    ).toEqual({ kind: 'none' });
  });

  it('blocks a version below the minimum supported one', () => {
    const decision = decideAppUpdate({
      installed: '1.1.5',
      release: release({ minimum_supported_version: '1.2.0' }),
      memory: memory({ lastSeenVersion: '1.1.5' }),
      now: NOW,
    });

    expect(decision).toMatchObject({ kind: 'forced', version: '1.2.0' });
  });

  it('does not block when the minimum is absent', () => {
    const decision = decideAppUpdate({
      installed: '1.1.5',
      release: release(),
      memory: memory({ lastSeenVersion: '1.1.5' }),
      now: NOW,
    });

    expect(decision).toMatchObject({ kind: 'available', version: '1.2.0' });
  });

  it('shows what changed after an upgrade', () => {
    const decision = decideAppUpdate({
      installed: '1.2.0',
      release: release({ current_notes: NOTES }),
      memory: memory({ lastSeenVersion: '1.1.5' }),
      now: NOW,
    });

    expect(decision).toEqual({ kind: 'whats_new', notes: NOTES });
  });

  it('records the version silently when the release shipped no notes', () => {
    const decision = decideAppUpdate({
      installed: '1.2.0',
      release: release({ current_notes: null }),
      memory: memory({ lastSeenVersion: '1.1.5' }),
      now: NOW,
    });

    expect(decision).toEqual({ kind: 'seen_only' });
  });

  it('never shows a changelog on a first install', () => {
    const decision = decideAppUpdate({
      installed: '1.2.0',
      release: release({ current_notes: NOTES }),
      memory: memory({ lastSeenVersion: null }),
      now: NOW,
    });

    expect(decision).toEqual({ kind: 'none' });
  });

  it('honours a snooze for the same version', () => {
    const snoozed = memory({
      lastSeenVersion: '1.1.5',
      snoozedVersion: '1.2.0',
      snoozedAt: NOW - 1000,
    });

    expect(decideAppUpdate({ installed: '1.1.5', release: release(), memory: snoozed, now: NOW })).toEqual({
      kind: 'none',
    });
  });

  it('prompts again once the snooze expires', () => {
    const snoozed = memory({
      lastSeenVersion: '1.1.5',
      snoozedVersion: '1.2.0',
      snoozedAt: NOW - SNOOZE_MS - 1,
    });

    expect(
      decideAppUpdate({ installed: '1.1.5', release: release(), memory: snoozed, now: NOW }),
    ).toMatchObject({ kind: 'available' });
  });

  it('a snooze of an older version does not silence a newer one', () => {
    const snoozed = memory({
      lastSeenVersion: '1.1.5',
      snoozedVersion: '1.1.9',
      snoozedAt: NOW,
    });

    expect(
      decideAppUpdate({ installed: '1.1.5', release: release(), memory: snoozed, now: NOW }),
    ).toMatchObject({ kind: 'available', version: '1.2.0' });
  });

  it('a blocked version cannot reach the dismissible prompts', () => {
    const snoozed = memory({
      lastSeenVersion: '1.1.5',
      snoozedVersion: '1.2.0',
      snoozedAt: NOW,
    });

    expect(
      decideAppUpdate({
        installed: '1.1.5',
        release: release({ minimum_supported_version: '1.2.0' }),
        memory: snoozed,
        now: NOW,
      }),
    ).toMatchObject({ kind: 'forced' });
  });

  it('stays silent when the installed version cannot be parsed', () => {
    expect(
      decideAppUpdate({
        installed: '1.2.0-rc1',
        release: release({ minimum_supported_version: '1.2.0' }),
        memory: memory({ lastSeenVersion: '1.2.0-rc1' }),
        now: NOW,
      }),
    ).toEqual({ kind: 'none' });
  });
});
