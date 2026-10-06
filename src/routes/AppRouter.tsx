import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Store } from 'lucide-react';

import { AuthProvider } from '../features/auth/AuthContext';
import { RequireAuth } from '../features/auth/RequireAuth';

import { RegisterPage } from '../features/auth/RegisterPage';
import { LoginPage } from '../features/auth/LoginPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage';
import { CompleteProfilePage } from '../features/auth/CompleteProfilePage';
import { NotificationsPage } from '../features/auth/NotificationsPage';
import { MessagesPage } from '../features/auth/MessagesPage';
import { PublicProfilePage } from '../features/auth/PublicProfilePage';
import { SuspendedPage } from '../features/auth/SuspendedPage';
import { EditProfilePage } from '../features/auth/EditProfilePage';

import { CreateListingPage } from '../features/listings/CreateListingPage';
import { CreateRoommateListingPage } from '../features/listings/CreateRoommateListingPage';
import { EditListingPage } from '../features/listings/EditListingPage';
import { MyListingsPage } from '../features/listings/MyListingsPage';
import { ListingDetailPage } from '../features/listings/ListingDetailPage';
import { HomeCompleteMapSection, ListingsFeed } from '../features/listings/ListingsFeed';
import { RoommatesPage } from '../features/listings/RoommatesPage';
import { ListingHistoryPage } from '../features/listings/ListingHistoryPage';

import { FavoritesPage } from '../features/favorites/FavoritesPage';
import { AdminPage } from '../features/admin/AdminPage';

import { LegalAcceptancePage } from '../features/legal/LegalAcceptancePage';
import { PrivacyNoticePage } from '../features/legal/PrivacyNoticePage';
import { TermsPage } from '../features/legal/TermsPage';

import { SupportPage } from '../features/support/SupportPage';

import { Navbar } from '../components/layout/Navbar';
import { Hero } from '../components/layout/Hero';
import { SiteFooter } from '../components/layout/SiteFooter';
import { NotFoundPage } from '../components/layout/NotFoundPage';
import { RouteMetadata } from '../components/seo/PageMeta';
import { AnalyticsConsent } from '../components/seo/AnalyticsConsent';
import { BusinessAdMarquee } from '../components/layout/BusinessAdMarquee';
import { LanguageProvider, useLanguage } from '../lib/i18n';
import { loadPublicBusinessAds, type PublicBusinessAd } from '../lib/business-ads';
import type { Listing } from '../types/models';

function HomePage() {
  const { locale, t } = useLanguage();
  const [mapListings, setMapListings] = useState<Listing[]>([]);
  const [businessAds, setBusinessAds] = useState<PublicBusinessAd[]>([]);
  useEffect(() => {
    let current = true;
    void loadPublicBusinessAds().then((ads) => { if (current) setBusinessAds(ads); }).catch(() => {});
    return () => { current = false; };
  }, []);
  return (
    <main className="min-h-screen bg-[#f5f0e5] dark:bg-[#1c211a]">
      <Hero />

      {locale === 'ote' && (
        <p className="mx-auto w-full px-5 pt-4 text-xs text-ink-500 sm:px-8 lg:px-12" lang="es-MX">
          {t('language.review')}
        </p>
      )}
      <section id="negocios-locales" aria-labelledby="local-businesses-heading" className="mx-auto w-full px-5 pb-6 pt-5 sm:px-8 lg:px-12">
        <h2 id="local-businesses-heading" className="sr-only">{t('home.businessEyebrow')}</h2>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[#263629] dark:text-ink-100">
          <div className="flex flex-wrap items-center gap-2">
            <span>{t('home.businessEyebrow')}</span>
            <span className="rounded-full bg-[#dce5d7] px-3 py-1 text-[0.62rem] tracking-[0.08em] text-[#365b43] dark:bg-white/10 dark:text-[#f1ca85]">{t('home.businessSponsored')}</span>
          </div>
          <span className="normal-case tracking-normal text-ink-500 dark:text-ink-300">{t('home.businessDirectContact')}</span>
        </div>
        {businessAds.length > 0 ? <BusinessAdMarquee ads={businessAds} locale={locale} /> : <div className="relative isolate grid overflow-hidden rounded-[1.75rem] bg-[#223127] shadow-[0_24px_60px_rgba(31,43,31,0.16)] sm:rounded-[2rem] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-10 flex flex-col justify-center p-6 text-white sm:p-9 lg:p-11">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-white/90">
                <Store className="h-3.5 w-3.5 text-[#e4b66e]" aria-hidden="true" />
                {t('home.businessEyebrow')}
              </span>
              <span className="rounded-full bg-[#e4b66e] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#263629]">
                {t('home.businessComingSoon')}
              </span>
            </div>
            <p className="max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
              {t('home.businessTitle')}
            </p>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
              {t('home.businessBody')}
            </p>
            <div className="mt-7 inline-flex w-fit items-center gap-2 border-t border-white/15 pt-4 text-xs font-medium text-white/65 sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-[#e4b66e]" aria-hidden="true" />
              {t('home.businessNote')}
            </div>
          </div>
          <div className="relative min-h-52 overflow-hidden sm:min-h-64 lg:min-h-[22rem]">
            <img
              src="/images/ixmiquilpan-hero.jpg"
              alt="Plaza principal de Ixmiquilpan"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#15221a]/75 via-[#15221a]/15 to-transparent lg:bg-gradient-to-r lg:from-[#223127] lg:via-[#223127]/25 lg:to-transparent" aria-hidden="true" />
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/20 bg-[#17231a]/65 p-4 text-white shadow-lg backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-6 sm:p-5 lg:bottom-8 lg:left-8">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[#f1ca85]">{t('home.businessPreviewLabel')}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">{t('home.businessPreviewTitle')}</p>
            </div>
          </div>
        </div>}
      </section>

      <section id="propiedades" className="mx-auto w-full px-5 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <ListingsFeed mode="properties" preview viewAllHref="/propiedades" viewAllLabel={t('home.viewAllProperties')} onListingsChange={setMapListings} />
      </section>

      <section id="roomies-destacados" className="mx-auto w-full px-5 pb-14 sm:px-8 sm:pb-20 lg:px-12 lg:pb-24">
        <ListingsFeed mode="roommates" preview viewAllHref="/roomies" viewAllLabel={t('home.viewRoommates')} />
      </section>

      <HomeCompleteMapSection listings={mapListings} />
    </main>
  );
}

function SkipToContentLink() {
  const { t } = useLanguage();
  return (
    <a href="#main-content" className="sr-only z-50 rounded-lg bg-white px-4 py-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
      {t('skip')}
    </a>
  );
}

function AllPropertiesPage() {
  return (
    <main className="min-h-screen bg-cream px-5 pb-16 pt-28 dark:bg-[#1c211a] sm:px-8 lg:px-12">
      <section id="propiedades" className="mx-auto max-w-7xl">
        <ListingsFeed mode="properties" />
      </section>
    </main>
  );
}

function AppContent() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileDrawerActive, setMobileDrawerActive] = useState(false);
  const pageScrollTop = useRef(0);
  const drawerCloseTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleDrawerChange = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean; scrollTop?: number }>).detail;
      const isOpen = Boolean(detail?.open);
      if (isOpen && Number.isFinite(detail.scrollTop)) pageScrollTop.current = detail.scrollTop as number;
      if (!isOpen) {
        const screen = document.getElementById('app-screen');
        if (screen) pageScrollTop.current = screen.scrollTop;
      }
      setMobileDrawerOpen(isOpen);
      window.clearTimeout(drawerCloseTimer.current);
      if (isOpen) {
        setMobileDrawerActive(true);
      } else if (window.matchMedia('(min-width: 640px)').matches) {
        setMobileDrawerActive(false);
      } else {
        drawerCloseTimer.current = window.setTimeout(() => {
          const screen = document.getElementById('app-screen');
          if (screen) pageScrollTop.current = screen.scrollTop;
          setMobileDrawerActive(false);
        }, 580);
      }
    };
    window.addEventListener('ixmiplace:mobile-drawer-change', handleDrawerChange);
    return () => {
      window.removeEventListener('ixmiplace:mobile-drawer-change', handleDrawerChange);
      window.clearTimeout(drawerCloseTimer.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!mobileDrawerActive) return;

    const screen = document.getElementById('app-screen');
    if (!screen) return;

    const body = document.body;
    const previousBodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const currentScrollTop = pageScrollTop.current;
    pageScrollTop.current = currentScrollTop;

    const rememberScreenScroll = () => {
      pageScrollTop.current = screen.scrollTop;
    };
    screen.addEventListener('scroll', rememberScreenScroll, { passive: true });
    screen.scrollTop = currentScrollTop;
    body.style.position = 'fixed';
    body.style.top = `-${currentScrollTop}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    return () => {
      const nextScrollTop = pageScrollTop.current;
      screen.removeEventListener('scroll', rememberScreenScroll);
      screen.scrollTop = 0;
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.left = previousBodyStyles.left;
      body.style.right = previousBodyStyles.right;
      body.style.width = previousBodyStyles.width;
      window.requestAnimationFrame(() => window.scrollTo(0, nextScrollTop || pageScrollTop.current));
    };
  }, [mobileDrawerActive]);

  return (
      <>
        <RouteMetadata />
        <AnalyticsConsent />
        <div id="app-screen" data-mobile-menu-open={mobileDrawerOpen} data-mobile-menu-active={mobileDrawerActive} className="mobile-menu-screen">
          <SkipToContentLink />

          <Navbar />

          <div id="main-content">
          <Routes>
            {/* =========================
                PÚBLICAS
            ========================== */}

            <Route path="/login" element={<LoginPage />} />
            <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/complete-profile" element={<CompleteProfilePage />} />

            <Route path="/listing/:id" element={<ListingDetailPage />} />
            <Route path="/propietario/:id" element={<PublicProfilePage />} />

            <Route path="/cuenta-suspendida" element={<SuspendedPage />} />

            {/* =========================
                LEGAL
            ========================== */}

            <Route
              path="/aviso-de-privacidad"
              element={<PrivacyNoticePage />}
            />

            <Route
              path="/terminos"
              element={<TermsPage />}
            />

            <Route
              path="/aceptacion-legal"
              element={<LegalAcceptancePage />}
            />

            {/* =========================
                SOPORTE
            ========================== */}

            <Route
              path="/apoyar"
              element={<SupportPage />}
            />

            {/* =========================
                PROTEGIDAS
            ========================== */}

            <Route element={<RequireAuth />}>
              <Route path="/" element={<HomePage />} />

              <Route path="/perfil" element={<EditProfilePage />} />

              <Route path="/publicar" element={<CreateListingPage />} />

              <Route path="/publicar-roomie" element={<CreateRoommateListingPage />} />

              <Route path="/propiedades" element={<AllPropertiesPage />} />

              <Route path="/roomies" element={<RoommatesPage />} />

              <Route path="/editar/:id" element={<EditListingPage />} />

              <Route
                path="/mis-publicaciones"
                element={<MyListingsPage />}
              />

              <Route path="/favoritos" element={<FavoritesPage />} />

              <Route
                path="/notificaciones"
                element={<NotificationsPage />}
              />

              <Route path="/mensajes" element={<MessagesPage />} />

              <Route
                path="/historial/:id"
                element={<ListingHistoryPage />}
              />

              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* =========================
                404
            ========================== */}

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </div>

          {/* Footer global */}
          <SiteFooter />
        </div>
      </>
  );
}

export function AppRouter() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
    </LanguageProvider>
    </AuthProvider>
  );
}

