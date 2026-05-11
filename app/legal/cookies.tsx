import { LegalPagePending } from '../../components/LegalPagePending';
import { useLanguage } from '../../context/LanguageContext';

export default function CookiesScreen() {
  const { t } = useLanguage();
  return <LegalPagePending title={t.legal.cookies_title} />;
}
