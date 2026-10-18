import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { InterestPushNoticeSheet } from '../../components/InterestPushNotice';
import { PageHeader } from '../../components/PageHeader';
import { Screen } from '../../components/Screen';
import { SettingsRow, SettingsSection } from '../../components/SettingsRow';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme/tokens';

/**
 * Dev gallery for D-170 suggestion pushes: the one-time notice and the
 * Settings switch, in the app's current language (switch it to check long
 * German and Chinese). Dev-only copy stays English and out of the i18n pipeline.
 */
export default function DevInterestPushGallery() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [last, setLast] = useState<string | null>(null);

  return (
    <Screen
      header={<PageHeader title="Suggestion pushes" subtitle="Notice and Settings switch" />}
      scroll
      bottomGap={28}
      contentClassName="px-5 gap-3"
    >
      <Pressable
        onPress={() => setOpen(true)}
        className="rounded-3xl bg-white p-5 active:opacity-80"
        testID="dev.interest-notice.open"
      >
        <Text className="text-[16px] font-bold" style={{ color: colors.textMain }}>
          One-time notice
        </Text>
        <Text className="mt-1 text-[13px]" style={{ color: colors.textMuted }}>
          Shown once on a phone that allows notifications, never over an update sheet
        </Text>
        {last ? (
          <Text className="mt-2 text-[12px]" style={{ color: colors.brandCoral }}>
            Last choice: {last}
          </Text>
        ) : null}
      </Pressable>

      <View>
        <SettingsSection title="Settings row">
          <SettingsRow
            icon="bulb-outline"
            label={t.settings.interest_push_label}
            hint={t.settings.interest_push_hint}
            trailing={
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ true: '#F47C7C', false: '#D6D9E0' }}
              />
            }
          />
        </SettingsSection>
      </View>

      <InterestPushNoticeSheet
        visible={open}
        onOk={() => {
          setOpen(false);
          setLast('OK');
        }}
        onTurnOff={() => {
          setOpen(false);
          setLast('Turn off');
        }}
      />
    </Screen>
  );
}
