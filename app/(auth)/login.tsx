import { router } from 'expo-router';

import { useLanguage } from '../../context/LanguageContext';
import { AUTH_FORM_MAX_WIDTH } from '../../theme/layout';
import { Screen } from '../../components/Screen';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { LoginForm } from '../../components/auth/LoginForm';

export default function LoginScreen() {
  const { t } = useLanguage();

  return (
    <Screen
      testID="auth.login.screen"
      background="auth"
      scroll
      keyboard
      bottomGap={32}
      header={(
        <AuthHeader
          title={t.auth.login}
          backLabel={t.common.back}
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/welcome');
            }
          }}
        />
      )}
      contentStyle={{
        paddingHorizontal: 22,
        paddingTop: 28,
        backgroundColor: '#FFFAF2',
        // D-145: the form stops growing and centres on a wide window.
        width: '100%',
        maxWidth: AUTH_FORM_MAX_WIDTH,
        alignSelf: 'center',
      }}
    >
      <LoginForm variant="page" />
    </Screen>
  );
}
