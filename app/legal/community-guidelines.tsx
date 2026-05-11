import { LegalPagePending } from '../../components/LegalPagePending';
import { useLanguage } from '../../context/LanguageContext';

export default function CommunityGuidelinesScreen() {
  const { t } = useLanguage();
  return <LegalPagePending title={t.legal.community_guidelines_title} />;
}
