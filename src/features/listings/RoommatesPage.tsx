import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ListingsFeed } from './ListingsFeed';
import { useLanguage } from '../../lib/i18n';

export function RoommatesPage() {
  const { locale } = useLanguage();

  return (
    <main className="min-h-screen bg-cream px-5 pb-16 pt-24 dark:bg-[#1c211a] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-800 transition hover:text-brand-600 dark:text-brand-200 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {locale === 'en' ? 'Back to home' : locale === 'ote' ? 'Hñäki IxmiPlace' : 'Volver al inicio'}
        </Link>
        <ListingsFeed mode="roommates" />
      </div>
    </main>
  );
}
