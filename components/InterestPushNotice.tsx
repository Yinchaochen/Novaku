import { Pressable, Text } from 'react-native';

import { SheetShell } from './appUpdate/UpdateSheets';
import { GradientButton } from './GradientButton';
import { useLanguage } from '../context/LanguageContext';
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
