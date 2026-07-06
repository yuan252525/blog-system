import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import zh from './locales/zh';
import en from './locales/en';

type Locale = 'zh' | 'en';
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Translations {
  [key: string]: string | Translations;
}

const locales: Record<Locale, Translations> = { zh, en };

/** 深度获取翻译文本，支持 {{key}} 插值 */
function translate(path: string, locale: Locale, params?: Record<string, string | number>): string {
  const keys = path.split('.');
  let value: string | Translations | undefined = locales[locale];

  for (const key of keys) {
    if (typeof value !== 'object' || value === null) return path;
    value = (value as Translations)[key];
  }

  let result = typeof value === 'string' ? value : path;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    });
  }

  return result;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const stored = localStorage.getItem('app-locale');
  if (stored === 'zh' || stored === 'en') return stored;
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('zh') ? 'zh' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('app-locale', newLocale);
    document.documentElement.lang = newLocale === 'zh' ? 'zh-CN' : 'en';
  }, []);

  const t = useCallback(
    (path: string, params?: Record<string, string | number>) => translate(path, locale, params),
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}
