import { ArrowRight, House, MapPin, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CATEGORIES } from '@/lib/constants';
import { useLanguage } from '@/lib/i18n';

export function Hero() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [category, setCategory] = useState('all');
  const [zone, setZone] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  function searchListings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (zone.trim()) params.set('search', zone.trim());
    if (maxPrice) params.set('maxPrice', maxPrice);
    const query = params.toString();
    navigate(`/propiedades${query ? `?${query}` : ''}`);
  }

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#15231b] pt-24 text-white lg:min-h-0 lg:bg-[#f5f0e5] lg:text-[#1d2920] lg:dark:bg-[#1c211a] lg:dark:text-ink-50 sm:pt-28">
      <div className="absolute inset-0 -z-10 lg:hidden">
        <img src="/images/ixmiquilpan-hero.jpg" alt="" aria-hidden="true" className="h-full w-full object-cover object-[61%_center]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#17251d]/75 via-[#17251d]/48 to-[#17251d]/80" aria-hidden="true" />
      </div>
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-[61%] lg:block">
        <img src="/images/ixmiquilpan-hero.jpg" alt="Plaza principal de Ixmiquilpan" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#f5f0e5] via-[#f5f0e5]/75 to-transparent backdrop-blur-[2px] dark:from-[#1c211a] dark:via-[#1c211a]/75" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f5f0e5]/30 via-transparent to-[#f5f0e5]/10 dark:from-[#1c211a]/40 dark:to-[#1c211a]/20" aria-hidden="true" />
      </div>

      <div className="mx-auto grid min-h-[calc(100svh-6rem)] w-full items-center gap-8 px-5 pb-10 pt-5 sm:px-8 sm:pb-12 lg:min-h-[535px] lg:grid-cols-[0.95fr_1.05fr] lg:gap-0 lg:px-12 lg:pb-14 lg:pt-8">
        <div className="relative z-10">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#17251d]/45 px-3.5 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-md sm:text-sm lg:border-[#d7d1c0] lg:bg-white/70 lg:text-[#415141] lg:dark:border-white/15 lg:dark:bg-white/[0.06] lg:dark:text-ink-100">
            <MapPin className="h-4 w-4 text-[#f1ca85] lg:text-[#b47a2a] lg:dark:text-[#e4b66e]" aria-hidden="true" />
            {t('hero.eyebrow')}
          </p>
          <h1 className="max-w-[700px] text-[clamp(2.5rem,3.9vw,4rem)] font-bold leading-[0.99] tracking-[-0.055em] text-white [text-wrap:balance] lg:text-[#171b17] lg:dark:text-ink-50">
            {t('hero.titleOne')}<br />{t('hero.titleTwo')} <span className="text-[#f1ca85] lg:text-[#477450] lg:dark:text-[#e4b66e]">Ixmiquilpan.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/90 sm:text-lg sm:leading-8 lg:text-[#565b54] lg:dark:text-ink-200">{t('hero.description')}</p>

          <form onSubmit={searchListings} style={{ backgroundColor: '#fffdf8', color: '#202620' }} className="mt-7 grid gap-2 rounded-[1.35rem] border border-white bg-[#fffdf8] p-2.5 shadow-[0_16px_45px_rgba(52,61,45,0.15)] lg:grid-cols-2 lg:gap-1.5 lg:p-3 2xl:grid-cols-[1fr_1fr_0.8fr_auto] 2xl:items-center 2xl:gap-0 2xl:p-2">
            <label className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl px-3 2xl:border-r 2xl:border-[#e4e0d6]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f3f1e9] text-[#25372a]"><House className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-[#202620]">{t('home.searchType')}</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)} style={{ color: '#75776f', colorScheme: 'light', backgroundColor: '#fffdf8' }} className="mt-0.5 w-full min-w-0 cursor-pointer appearance-none truncate bg-[#fffdf8] text-sm text-[#75776f] outline-none">
                  <option value="all">{t('home.searchTypeAny')}</option>
                  {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </span>
            </label>

            <label className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl px-3 2xl:border-r 2xl:border-[#e4e0d6]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f3f1e9] text-[#25372a]"><MapPin className="h-4 w-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-[#202620]">{t('home.searchZone')}</span>
                <input value={zone} onChange={(event) => setZone(event.target.value)} placeholder={t('home.searchZonePlaceholder')} style={{ color: '#555b54', colorScheme: 'light', backgroundColor: '#fffdf8' }} className="mt-0.5 w-full bg-[#fffdf8] text-sm text-[#555b54] outline-none placeholder:text-[#8a8c84]" />
              </span>
            </label>

            <label className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl px-3 2xl:border-r 2xl:border-[#e4e0d6]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f3f1e9] text-lg font-semibold text-[#25372a]" aria-hidden="true">$</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-[#202620]">{t('home.searchPrice')}</span>
                <select value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} style={{ color: '#75776f', colorScheme: 'light', backgroundColor: '#fffdf8' }} className="mt-0.5 w-full cursor-pointer appearance-none bg-[#fffdf8] text-sm text-[#75776f] outline-none">
                  <option value="">{t('home.searchAnyPrice')}</option>
                  <option value="5000">$5,000 MXN</option>
                  <option value="10000">$10,000 MXN</option>
                  <option value="20000">$20,000 MXN</option>
                  <option value="50000">$50,000 MXN</option>
                </select>
              </span>
            </label>

            <button type="submit" className="motion-ease inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#477450] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#385f40] active:translate-y-0 lg:col-span-2 2xl:col-span-1 2xl:ml-2">
              <Search className="h-4 w-4" aria-hidden="true" />{t('home.searchButton')}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white/85 sm:text-sm lg:text-[#697064] lg:dark:text-ink-200">
            <span>{t('hero.rentals')}</span><span aria-hidden="true">·</span><span>{t('hero.stays')}</span><span aria-hidden="true">·</span><span>{t('hero.direct')}</span>
            <Link to="/publicar" className="ml-auto inline-flex items-center gap-1 font-semibold text-[#f1ca85] hover:text-white lg:text-[#3f6b47] lg:hover:text-[#243d2a] lg:dark:text-[#e4b66e] lg:dark:hover:text-[#f1ca85]">{t('hero.publish')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </div>

      </div>
    </section>
  );
}
