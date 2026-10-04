import { Heart, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-cream-200 bg-cream-100 px-4 py-8 text-ink-600 dark:border-[#4b5847] dark:bg-[#1c211a] dark:text-ink-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-ink-700 dark:text-ink-50">
            Ixmi<span className="text-brand-600 dark:text-brand-300">Place</span>
          </p>
          <p className="mt-1 text-xs">{t('footer.tagline')}</p>
        </div>
        <nav aria-label="Enlaces legales y de apoyo" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <Link to="/aviso-de-privacidad" className="hover:text-brand-700 dark:hover:text-brand-300">{t('footer.privacy')}</Link>
          <Link to="/terminos" className="hover:text-brand-700 dark:hover:text-brand-300">{t('footer.terms')}</Link>
          <Link to="/apoyar" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200">
            <Heart className="h-4 w-4" /> {t('footer.support')}
          </Link>
          <a href="mailto:ixmiplacesupport@gmail.com" className="inline-flex items-center gap-1.5 hover:text-brand-700 dark:hover:text-brand-300">
            <Mail className="h-4 w-4" /> {t('footer.contact')}
          </a>
        </nav>
      </div>
      <p className="mx-auto mt-5 max-w-7xl text-xs text-ink-400">© {new Date().getFullYear()} IxmiPlace · {t('footer.copyright')}</p>
    </footer>
  );
}
