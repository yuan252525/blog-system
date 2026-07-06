import { useTranslation } from '../i18n/context';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <button
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
      title={t('language.switch')}
      aria-label={t('language.switch')}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-medium">{locale === 'zh' ? 'EN' : '中文'}</span>
    </button>
  );
}
