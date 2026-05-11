import { LegalPagePending } from '../../components/LegalPagePending';
import { useLanguage } from '../../context/LanguageContext';

export default function TransparencyScreen() {
  const { t } = useLanguage();
  return <LegalPagePending title={t.legal.transparency_title} />;
}
