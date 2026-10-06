import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, MapPin, Search, Store } from 'lucide-react';
import { BUSINESS_PACKAGE_PRICES, businessPackageTotal, loadPublicBusinessDirectory, recordBusinessProfileMetric, type BusinessPackage, type PublicBusinessProfile } from '../../lib/business-ads';
import { useLanguage } from '../../lib/i18n';

function businessInquiryUrl(english: boolean) {
  const subject = english ? 'IxmiPlace local business listing' : 'Quiero anunciar mi negocio en IxmiPlace';
  const body = english
    ? 'Hello IxmiPlace, I would like information about a local business listing.\n\nBusiness name:\nContact name:\nPhone or WhatsApp:\nPackage of interest:\nPreferred period: 1, 3, or 6 months:\n'
    : 'Hola IxmiPlace, quiero información para agregar mi negocio al directorio.\n\nNombre del negocio:\nNombre de contacto:\nTeléfono o WhatsApp:\nPaquete de interés (Ficha local, Anuncio rotativo o Anuncio destacado):\nPeriodo de interés (1, 3 o 6 meses):\n';
  return `https://mail.google.com/mail/?view=cm&fs=1&to=ixmiplacesupport@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function isFeaturedNow(profile: PublicBusinessProfile, now: number) {
  return profile.package === 'featured' && Boolean(profile.featuredStartAt && profile.featuredEndsAt)
    && Number(profile.featuredStartAt) <= now && Number(profile.featuredEndsAt) > now;
}

function useVisibleProfileMetrics(profiles: PublicBusinessProfile[]) {
  const seen = useRef(new Set<string>());
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const id = (entry.target as HTMLElement).dataset.profileId;
        if (!id || seen.current.has(id)) continue;
        seen.current.add(id);
        try {
          const key = `ixmiplace:business-profile-view:${id}`;
          if (sessionStorage.getItem(key)) continue;
          sessionStorage.setItem(key, '1');
        } catch { /* El control en memoria evita repetir durante la sesión de la página. */ }
        void recordBusinessProfileMetric(id, 'profileViews');
      }
    }, { threshold: 0.5 });
    document.querySelectorAll<HTMLElement>('[data-profile-impression]').forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [profiles]);
}

export function BusinessDirectoryPage() {
  const { locale } = useLanguage();
  const english = locale === 'en';
  const [profiles, setProfiles] = useState<PublicBusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [now, setNow] = useState(0);

  async function refresh() {
    setLoading(true);
    setError('');
    try { setProfiles(await loadPublicBusinessDirectory()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el directorio.'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { setNow(Date.now()); void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useVisibleProfileMetrics(profiles);

  const categories = useMemo(() => [...new Set(profiles.map((profile) => profile.category))].sort((a, b) => a.localeCompare(b, 'es')), [profiles]);
  const normalizedSearch = search.trim().toLocaleLowerCase(english ? 'en' : 'es-MX');
  const filteredProfiles = useMemo(() => profiles.filter((profile) => {
    const matchesCategory = category === 'all' || profile.category === category;
    const matchesSearch = !normalizedSearch || [profile.businessName, profile.category, profile.description, profile.location]
      .some((value) => value.toLocaleLowerCase(english ? 'en' : 'es-MX').includes(normalizedSearch));
    return matchesCategory && matchesSearch;
  }), [profiles, category, normalizedSearch, english]);
  const featured = filteredProfiles.filter((profile) => isFeaturedNow(profile, now));
  const regular = filteredProfiles.filter((profile) => !isFeaturedNow(profile, now));

  function contact(profile: PublicBusinessProfile) {
    void recordBusinessProfileMetric(profile.id, 'contactClicks');
  }

  return (
    <main className="min-h-screen bg-[#f5f0e5] pb-20 pt-28 text-[#172018] dark:bg-[#1c211a] dark:text-white sm:pt-32">
      <section className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-[#203126] px-6 py-10 text-white shadow-[0_24px_64px_rgba(31,43,31,.18)] sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="absolute inset-0 -z-10 opacity-25" aria-hidden="true">
            <div className="absolute -right-24 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#88a881] blur-3xl" />
            <div className="absolute -bottom-48 left-1/4 h-96 w-96 rounded-full bg-[#e4b66e] blur-3xl" />
          </div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#f1ca85]">
            <Store className="h-4 w-4" aria-hidden="true" /> {english ? 'Local guide · Ixmiquilpan' : 'Guía local · Ixmiquilpan'}
          </p>
          <div className="mt-6 max-w-3xl">
            <h1 className="text-4xl font-bold leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              {english ? <>The best of <span className="text-[#c4d5bd]">Ixmiquilpan</span>, close to you.</> : <>Lo mejor de <span className="text-[#c4d5bd]">Ixmiquilpan</span>, cerca de ti.</>}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              {english ? 'Discover local shops and services, explore what they offer, and contact each business directly.' : 'Descubre comercios y servicios de la comunidad, conoce lo que ofrecen y contacta directamente con cada negocio.'}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/75">
            <span>{english ? 'Local businesses' : 'Negocios de aquí'}</span><span aria-hidden="true">·</span>
            <span>{english ? 'Direct contact' : 'Contacto directo'}</span><span aria-hidden="true">·</span>
            <span>{english ? 'Community first' : 'La comunidad primero'}</span>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-[#e6dfcf] bg-white/90 p-4 shadow-[0_10px_32px_rgba(31,43,31,.06)] dark:border-white/10 dark:bg-[#242a22] sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]">
            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#e6dfcf] bg-[#fbfaf6] px-4 dark:border-white/10 dark:bg-white/5">
              <Search className="h-4 w-4 shrink-0 text-[#52634a] dark:text-[#c4d5bd]" aria-hidden="true" />
              <span className="sr-only">{english ? 'Search businesses' : 'Buscar negocios'}</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={english ? 'Business, service, or area' : 'Negocio, servicio o zona'} className="w-full bg-transparent text-sm outline-none placeholder:text-[#85877f]" />
            </label>
            <label className="flex min-h-12 items-center rounded-2xl border border-[#e6dfcf] bg-[#fbfaf6] px-4 dark:border-white/10 dark:bg-white/5">
              <span className="sr-only">{english ? 'Category' : 'Categoría'}</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full bg-transparent text-sm outline-none">
                <option value="all">{english ? 'All categories' : 'Todas las categorías'}</option>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 px-1 text-xs text-[#73776e] dark:text-white/55">
            {loading ? (english ? 'Loading local businesses…' : 'Cargando negocios locales…') : english ? `${filteredProfiles.length} ${filteredProfiles.length === 1 ? 'business' : 'businesses'} in the directory` : `${filteredProfiles.length} ${filteredProfiles.length === 1 ? 'negocio en el directorio' : 'negocios en el directorio'}`}
          </p>
        </div>

        {error && <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => void refresh()} className="font-semibold underline underline-offset-2">{english ? 'Try again' : 'Intentar de nuevo'}</button></div>}

        {featured.length > 0 && (
          <section aria-labelledby="featured-businesses-heading" className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#477450] dark:text-[#c4d5bd]">{english ? 'This week' : 'Esta semana'}</p><h2 id="featured-businesses-heading" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{english ? 'Featured nearby' : 'Destacados cerca de ti'}</h2></div>
              <span className="hidden rounded-full bg-[#e8c17b]/25 px-3 py-1.5 text-xs font-semibold text-[#74541d] dark:text-[#f1ca85] sm:inline-flex">{english ? 'Limited weekly placement' : 'Espacio destacado por semana'}</span>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {featured.map((profile) => <BusinessCard key={profile.id} profile={profile} now={now} featured onContact={() => contact(profile)} english={english} />)}
            </div>
          </section>
        )}

        <section aria-labelledby="directory-heading" className="mt-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#477450] dark:text-[#c4d5bd]">{english ? 'Explore local' : 'Explora lo local'}</p><h2 id="directory-heading" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{english ? 'Businesses and services' : 'Comercios y servicios'}</h2></div>
            <p className="max-w-md text-sm text-[#6f746b] dark:text-white/60">{english ? 'A growing guide to the people and businesses that make our community.' : 'Una guía que crece con las personas y negocios que hacen comunidad.'}</p>
          </div>
          {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-3xl bg-white/70 dark:bg-white/5" />)}</div>
            : regular.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{regular.map((profile) => <BusinessCard key={profile.id} profile={profile} now={now} onContact={() => contact(profile)} english={english} />)}</div>
              : !error && <div className="rounded-3xl border border-dashed border-[#d9d1bd] bg-white/60 px-6 py-14 text-center dark:border-white/15 dark:bg-white/[.03]">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9eee5] text-[#426b4d] dark:bg-white/10 dark:text-[#c4d5bd]"><Store className="h-6 w-6" aria-hidden="true" /></span>
                <h3 className="mt-5 text-lg font-bold">{profiles.length === 0 ? (english ? 'We are adding local businesses' : 'Estamos sumando negocios locales') : (english ? 'No results for this search' : 'No encontramos resultados')}</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#74776f] dark:text-white/60">{profiles.length === 0 ? (english ? 'This directory will bring together local shops and services, with direct contact and current information.' : 'Este directorio reunirá comercios y servicios de la zona, con contacto directo e información vigente.') : (english ? 'Try another term or category.' : 'Prueba con otro término o categoría.')}</p>
                {profiles.length > 0 && <button type="button" onClick={() => { setSearch(''); setCategory('all'); }} className="mt-4 text-sm font-semibold text-[#365b43] underline underline-offset-4 dark:text-[#c4d5bd]">{english ? 'Clear filters' : 'Quitar filtros'}</button>}
              </div>}
        </section>

        <section aria-labelledby="local-packages-heading" className="mt-14 overflow-hidden rounded-[2rem] border border-[#ded7c5] bg-white/80 p-5 shadow-[0_16px_48px_rgba(31,43,31,.06)] dark:border-white/10 dark:bg-[#242a22] sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#477450] dark:text-[#c4d5bd]">{english ? 'For local businesses' : 'Para los negocios locales'}</p><h2 id="local-packages-heading" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{english ? 'Let the community find you' : 'Haz que la comunidad te encuentre'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f746b] dark:text-white/60">{english ? 'Clear packages, fixed periods, and direct contact with IxmiPlace to arrange your listing.' : 'Paquetes claros, periodos definidos y trato directo con IxmiPlace para acordar tu ficha.'}</p></div>
            <a href={businessInquiryUrl(english)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#365b43] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2d4c38] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5a954]">{english ? 'Ask about a listing' : 'Preguntar por mi ficha'}<ArrowRight className="h-4 w-4" aria-hidden="true"/></a>
          </div>
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {([
              { key: 'listing', name: english ? 'Local profile' : 'Ficha local', detail: english ? 'Directory profile, description, location, and contact button.' : 'Negocio en el directorio, descripción, ubicación y botón de contacto.' },
              { key: 'rotating', name: english ? 'Rotating ad' : 'Anuncio rotativo', detail: english ? 'Local profile plus a banner shared with up to 10 rotating ads.' : 'Ficha local más banner compartido en rotación entre hasta 10 anuncios.' },
              { key: 'featured', name: english ? 'Featured ad' : 'Anuncio destacado', detail: english ? 'Rotating ad plus one featured week, subject to availability.' : 'Anuncio rotativo más una semana destacada, sujeto a disponibilidad.' },
            ] as { key: BusinessPackage; name: string; detail: string }[]).map((item) => (
              <article key={item.key} className={`rounded-2xl border p-5 ${item.key === 'featured' ? 'border-[#d5a954] bg-[#fffaf0] dark:bg-[#302d22]' : 'border-[#e6dfcf] bg-[#fbfaf6] dark:border-white/10 dark:bg-white/[.03]'}`}>
                <div className="flex items-start justify-between gap-3"><h3 className="font-bold">{item.name}</h3><span className="whitespace-nowrap text-sm font-bold text-[#365b43] dark:text-[#c4d5bd]">${BUSINESS_PACKAGE_PRICES[item.key]} MXN <span className="font-normal text-[#71776e] dark:text-white/55">/ mes</span></span></div>
                <p className="mt-2 min-h-12 text-sm leading-5 text-[#6f746b] dark:text-white/60">{item.detail}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#e6dfcf] pt-3 text-xs dark:border-white/10"><p><span className="block text-[#777b73] dark:text-white/55">{english ? '3 months · 10% off' : '3 meses · 10% menos'}</span><strong className="mt-1 block text-sm">${businessPackageTotal(item.key, 3).toLocaleString('es-MX')} MXN</strong></p><p><span className="block text-[#777b73] dark:text-white/55">{english ? '6 months · 15% off' : '6 meses · 15% menos'}</span><strong className="mt-1 block text-sm">${businessPackageTotal(item.key, 6).toLocaleString('es-MX')} MXN</strong></p></div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-[#777b73] dark:text-white/50">{english ? 'Payment is arranged directly; IxmiPlace does not charge automatically. Banner space is limited to 10 businesses, and only one featured business can occupy a given week.' : 'El pago se acuerda directamente; IxmiPlace no realiza cobros automáticos. El banner tiene un máximo de 10 negocios y solo puede haber un destacado en una misma semana.'}</p>
        </section>
      </section>
    </main>
  );
}

function BusinessCard({ profile, now, featured = false, onContact, english }: {
  profile: PublicBusinessProfile;
  now: number;
  featured?: boolean;
  onContact: () => void;
  english: boolean;
}) {
  const highlighted = featured || isFeaturedNow(profile, now);
  const hasBanner = profile.package !== 'listing' && Boolean(profile.desktopImageUrl);
  const bannerAspect = highlighted ? 'aspect-[4/5] bg-[#203126] sm:aspect-[5120/1080]' : 'aspect-[16/10] bg-[#203126] sm:aspect-[16/7]';
  return (
    <article data-profile-impression="" data-profile-id={profile.id} className={`overflow-hidden rounded-3xl border bg-white shadow-[0_10px_32px_rgba(31,43,31,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(31,43,31,.12)] dark:border-white/10 dark:bg-[#242a22] ${highlighted ? 'border-[#d5a954] ring-1 ring-[#d5a954]/40 xl:col-span-2' : 'border-[#e6dfcf]'}`}>
      <div className={`relative flex items-center justify-center overflow-hidden ${hasBanner ? bannerAspect : 'h-36 bg-[radial-gradient(circle_at_75%_5%,#d9e5d2,transparent_45%),linear-gradient(135deg,#f8f4e9,#e8eee3)] dark:bg-[radial-gradient(circle_at_75%_5%,#445441,transparent_45%),linear-gradient(135deg,#2b3027,#20281f)]'}`}>
        {hasBanner ? <picture className="absolute inset-0"><source media="(max-width: 767px)" srcSet={profile.mobileImageUrl} /><img src={profile.desktopImageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /></picture>
          : <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/80 bg-white/75 text-[#426b4d] shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#1c211a]/75 dark:text-[#c4d5bd]"><Store className="h-7 w-7" aria-hidden="true" /></div>}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-[0.68rem] font-bold text-[#253328] shadow-sm">{profile.category}</span>
          {highlighted ? <span className="rounded-full bg-[#e4b66e] px-3 py-1.5 text-[0.68rem] font-bold text-[#263629]">{english ? 'Featured this week' : 'Destacado esta semana'}</span>
            : profile.package !== 'listing' && <span className="rounded-full bg-[#203126]/90 px-3 py-1.5 text-[0.68rem] font-bold text-white">{english ? 'Sponsored' : 'Patrocinado'}</span>}
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <h3 className="text-xl font-bold tracking-tight text-[#202820] dark:text-white">{profile.businessName}</h3>
        <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#687067] dark:text-white/65">{profile.description}</p>
        <p className="mt-4 flex items-start gap-2 text-sm font-medium text-[#52634a] dark:text-[#c4d5bd]"><MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"/><span>{profile.location}, Ixmiquilpan</span></p>
        <div className="mt-5 flex flex-col gap-2 border-t border-[#e9e5dc] pt-4 dark:border-white/10 sm:flex-row">
          <a href={profile.contactUrl} target="_blank" rel="noopener noreferrer" onClick={onContact} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#365b43] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d4c38] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5a954]">{profile.contactLabel}<ArrowRight className="h-4 w-4" aria-hidden="true"/></a>
          {profile.mapUrl && <a href={profile.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d9d1bd] px-4 py-2.5 text-sm font-semibold text-[#3f4c40] transition hover:bg-[#f8f5ee] dark:border-white/15 dark:text-white dark:hover:bg-white/5"><MapPin className="h-4 w-4" aria-hidden="true"/><span className="sm:hidden xl:inline">{english ? 'Map' : 'Mapa'}</span></a>}
        </div>
      </div>
    </article>
  );
}
