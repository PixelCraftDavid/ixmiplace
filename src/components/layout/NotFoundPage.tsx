import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export function NotFoundPage() {
  const { t } = useLanguage();
  return (
    <main className="flex min-h-[75svh] items-center bg-cream px-4 py-14 text-ink dark:bg-[#1c211a] dark:text-ink-50">
      <section className="mx-auto grid w-full max-w-6xl items-center gap-8 rounded-[2rem] border border-cream-200 bg-white p-6 shadow-[0_24px_80px_rgba(27,32,24,0.08)] dark:border-[#4b5847] dark:bg-[#293027] sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:p-14">
        <div className="order-2 max-w-xl lg:order-1">
          <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-amber-900 dark:bg-amber-900/25 dark:text-amber-200">
            <MapPin className="h-4 w-4" aria-hidden="true" /> {t('notFound.eyebrow')}
          </p>
          <p className="mt-7 text-7xl font-bold leading-none tracking-tight text-brand-700 dark:text-brand-200">404</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{t('notFound.title')}</h1>
          <p className="mt-4 max-w-lg leading-7 text-ink-500 dark:text-ink-300">
            {t('notFound.body')}
          </p>
          <Link to="/" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#344a36] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#293d2d] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent-400 dark:bg-[#597657] dark:hover:bg-[#668563]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t('notFound.back')}
          </Link>
        </div>

        <div className="order-1 mx-auto w-full max-w-[42rem] lg:order-2">
          <img
            src="/404-traveler.png"
            alt="Una camioneta coral cargada con maletas está detenida por una llanta delantera ponchada. Afuera, una persona consulta un mapa para encontrar el camino."
            width="1024"
            height="683"
            decoding="async"
            fetchPriority="high"
            className="h-auto w-full drop-shadow-[0_18px_24px_rgba(52,74,54,0.12)]"
          />
        </div>
      </section>
    </main>
  );
}
