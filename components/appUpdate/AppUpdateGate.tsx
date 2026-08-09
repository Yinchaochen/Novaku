import { useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { UpdateAvailableSheet, UpdateRequiredSheet, WhatsNewSheet } from './UpdateSheets';
import { useAppRelease } from '../../features/appUpdate/useAppRelease';
import { decideAppUpdate, installedAppVersion } from '../../lib/appVersion';
import { useAppUpdateStore } from '../../store/appUpdateStore';

/**
 * Decides — and shows — what this build should say about updates:
 * what changed after an upgrade, that a newer version exists, or that this
 * version is no longer supported. Mounted once, above the tabs.
 */
export function AppUpdateGate() {
  const installed = installedAppVersion();
  const { data: release } = useAppRelease();
  const hydrated = useAppUpdateStore((s) => s.hydrated);
  const hydrate = useAppUpdateStore((s) => s.hydrate);
  const lastSeenVersion = useAppUpdateStore((s) => s.lastSeenVersion);
  const snoozedVersion = useAppUpdateStore((s) => s.snoozedVersion);
  const snoozedAt = useAppUpdateStore((s) => s.snoozedAt);
  const markVersionSeen = useAppUpdateStore((s) => s.markVersionSeen);
  const snooze = useAppUpdateStore((s) => s.snooze);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const decision = useMemo(() => {
    if (!hydrated) return { kind: 'none' as const };
    return decideAppUpdate({
      installed,
      release,
      memory: { lastSeenVersion, snoozedVersion, snoozedAt },
      now: Date.now(),
    });
  }, [hydrated, installed, release, lastSeenVersion, snoozedVersion, snoozedAt]);

  useEffect(() => {
    // Upgraded, but this version shipped without notes — record it silently so
    // the check does not run again on every launch.
    if (decision.kind === 'seen_only') markVersionSeen(installed);
  }, [decision.kind, installed, markVersionSeen]);

  const openStore = (storeUrl: string) => {
    setDismissed(true);
    void Linking.openURL(storeUrl).catch(() => {
      // Store app missing or URL rejected: leaving the sheet closed is better
      // than trapping the user behind an action that cannot complete.
    });
  };

  if (decision.kind === 'forced') {
    return (
      <UpdateRequiredSheet
        visible
        version={decision.version}
        notes={decision.notes}
        onUpdate={() => void Linking.openURL(decision.storeUrl).catch(() => {})}
      />
    );
  }

  if (decision.kind === 'whats_new') {
    return (
      <WhatsNewSheet
        visible={!dismissed}
        notes={decision.notes}
        onClose={() => {
          setDismissed(true);
          markVersionSeen(installed);
        }}
      />
    );
  }

  if (decision.kind === 'available') {
    return (
      <UpdateAvailableSheet
        visible={!dismissed}
        version={decision.version}
        notes={decision.notes}
        onUpdate={() => openStore(decision.storeUrl)}
        onLater={() => {
          setDismissed(true);
          snooze(decision.version, Date.now());
        }}
      />
    );
  }

  return null;
}
