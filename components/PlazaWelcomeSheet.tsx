import { useEffect } from 'react';
import { Text } from 'react-native';

import { SheetShell } from './appUpdate/UpdateSheets';
import { GradientButton } from './GradientButton';
import { useLanguage } from '../context/LanguageContext';
import { usePlazaWelcomeStore } from '../store/plazaWelcomeStore';
import { colors } from '../theme/tokens';

/** What the Plaza is, said once, before anything asks the reader to do
 *  something (D-188). Presentation only, so the dev gallery can render it. */
export function PlazaWelcomeSheetView({
  visible,
  onOk,
}: {
  visible: boolean;
  onOk: () => void;
}) {
  const { t } = useLanguage();
  return (
    <SheetShell
      visible={visible}
      onDismiss={onOk}
      title={t.plaza_welcome.title}
      placement="center"
    >
      <Text
        className="text-[15px] leading-6"
        style={{ color: colors.textBrown }}
        testID="plaza-welcome.body"
      >
        {t.plaza_welcome.body}
      </Text>
      <GradientButton
        label={t.plaza_welcome.ok}
        onPress={onOk}
        fullWidth
        style={{ marginTop: 24 }}
      />
    </SheetShell>
  );
}

/** Shown to anyone who has not seen it, signed in or not — a stranger reading
 *  the web Plaza from a shared link is who it is written for. The caller
 *  decides when the screen is free; this one only owns the reading of it. */
export function PlazaWelcomeSheet({ allowed }: { allowed: boolean }) {
  const hydrated = usePlazaWelcomeStore((s) => s.hydrated);
  const seen = usePlazaWelcomeStore((s) => s.seen);
  const hydrate = usePlazaWelcomeStore((s) => s.hydrate);
  const markSeen = usePlazaWelcomeStore((s) => s.markSeen);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  return <PlazaWelcomeSheetView visible={allowed && hydrated && !seen} onOk={markSeen} />;
}
