import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getTranslations, Translations } from '../lib/i18n';
import {
  getCurrentLocale,
  hydrateCurrentLocale,
  persistCurrentLocale,
  setCurrentLocale,
} from '../lib/locale';

interface LanguageContextValue {
  langCode: string;
  t: Translations;
  setLangCode: (code: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [langCode, setLangCodeState] = useState(getCurrentLocale());

  useEffect(() => {
    hydrateCurrentLocale()
      .then((savedLocale) => {
        setLangCodeState(savedLocale);
      });
  }, []);

  const setLangCode = useCallback(async (code: string) => {
    setCurrentLocale(code);
    setLangCodeState(code);
    await persistCurrentLocale(code);
  }, []);

  return (
    <LanguageContext.Provider value={{ langCode, t: getTranslations(langCode), setLangCode }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
