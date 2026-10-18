import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform, Pressable, Text } from 'react-native';

import { SheetShell } from './appUpdate/UpdateSheets';
import { GradientButton } from './GradientButton';
import { useLanguage } from '../context/LanguageContext';
import { useAppRelease } from '../features/appUpdate/useAppRelease';
import { useUpdateInterestPush } from '../features/social/useSocial';
import { decideAppUpdate, installedAppVersion } from '../lib/appVersion';
import { useAppUpdateStore } from '../store/appUpdateStore';
import { useAuthStore } from '../store/authStore';
import { useProductGuideStore } from '../store/guideStore';
import { colors } from '../theme/tokens';

/** What the suggestions are, before the first one arrives (D-170). Shown once;
 *  the server sends nothing until the person has seen it. */
export function InterestPushNoticeSheet({
  visible,
  onOk,
  onTurnOff,
}: {
  visible: boolean;
  onOk: () => void;
  onTurnOff: () => void;
}) {
  const { t } = useLanguage();
  return (
    <SheetShell
      visible={visible}
      onDismiss={onOk}
      eyebrow={t.interest_notice.eyebrow}
      title={t.interest_notice.title}
    >
      <Text className="text-[15px] leading-6" style={{ color: colors.textBrown }}>
        {t.interest_notice.body}
      </Text>
      <Text className="mt-3 text-[13px] leading-5" style={{ color: colors.textMutedOnCream }}>
        {t.interest_notice.privacy}
      </Text>
      <GradientButton
        label={t.interest_notice.ok}
        onPress={onOk}
        fullWidth
        style={{ marginTop: 24 }}
      />
      <Pressable onPress={onTurnOff} className="items-center py-4" testID="interest-notice.turn-off">
        <Text className="text-[14px]" style={{ color: colors.textMutedOnCream }}>
          {t.interest_notice.turn_off}
        </Text>
      </Pressable>
    </SheetShell>
  );
}

/** Decides when to show the notice: on a phone that allows notifications, for
 *  someone who has the suggestions on and has not seen it, and never on top of
 *  an update sheet. */
export function InterestPushNotice() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const update = useUpdateInterestPush();
  const [granted, setGranted] = useState(false);
  const [closed, setClosed] = useState(false);

  const installed = installedAppVersion();
  const { data: release, isPending: releasePending } = useAppRelease();
  const guideStep = useProductGuideStore((s) => s.step);
  const hydrated = useAppUpdateStore((s) => s.hydrated);
  const lastSeenVersion = useAppUpdateStore((s) => s.lastSeenVersion);
  const snoozedVersion = useAppUpdateStore((s) => s.snoozedVersion);
  const snoozedAt = useAppUpdateStore((s) => s.snoozedAt);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const read = () => {
      Notifications.getPermissionsAsync()
        .then((permission) => setGranted(permission.granted))
        .catch(() => {});
    };
    read();
    // Permission can be granted in system settings while the app is away.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') read();
    });
    return () => sub.remove();
  }, []);

  const updateSheetIdle = useMemo(() => {
    // While the release check is in flight the update gate may still open a
    // sheet; two sheets at once is the thing to avoid.
    if (!hydrated || releasePending) return false;
    const decision = decideAppUpdate({
      installed,
      release,
      memory: { lastSeenVersion, snoozedVersion, snoozedAt },
      now: Date.now(),
    });
    return decision.kind === 'none' || decision.kind === 'seen_only';
  }, [hydrated, releasePending, installed, release, lastSeenVersion, snoozedVersion, snoozedAt]);

  const visible =
    Platform.OS !== 'web' &&
    granted &&
    updateSheetIdle &&
    guideStep === null &&
    !closed &&
    !!user &&
    user.interest_push_enabled !== false &&
    !user.interest_push_notice_seen_at;

  const finish = (enabled: boolean) => {
    setClosed(true);
    update.mutate(enabled ? { notice_seen: true } : { notice_seen: true, enabled: false }, {
      onSuccess: (updated) => {
        if (updated) setUser(updated);
      },
    });
  };

  return (
    <InterestPushNoticeSheet
      visible={visible}
      onOk={() => finish(true)}
      onTurnOff={() => finish(false)}
    />
  );
}
