import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ArrowRight, House, Users } from 'lucide-react';

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
import { ListingsFeed } from '../features/listings/ListingsFeed';
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
import { LanguageProvider, useLanguage } from '../lib/i18n';

function HomePage() {
  const { locale, t } = useLanguage();
  return (
    <main className="min-h-screen bg-cream">
      <Hero />

      {locale === 'ote' && (
        <p className="mx-auto max-w-7xl px-5 pt-4 text-xs text-ink-500 sm:px-8 lg:px-12" lang="es-MX">
          {t('language.review')}
        </p>
      )}
      <section aria-labelledby="home-search-heading" className="mx-auto max-w-7xl px-5 pb-4 pt-10 sm:px-8 lg:px-12">
        <h2 id="home-search-heading" className="mb-5 text-xl font-bold tracking-tight text-ink-800 dark:text-white sm:text-2xl">
          {t('home.choose')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <a href="#propiedades" className="group rounded-2xl border border-ink-700/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-md dark:border-white/10 dark:bg-[#242a22] sm:p-6">
            <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
              <House className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-bold text-ink-800 dark:text-white">{t('home.propertiesTitle')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-300">{t('home.propertiesBody')}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-800 dark:text-brand-200">
              {t('home.propertiesAction')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </a>
          <Link to="/roomies" className="group rounded-2xl border border-brand-700/20 bg-brand-50/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-md dark:border-brand-200/15 dark:bg-brand-900/10 sm:p-6">
            <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-white text-brand-800 dark:bg-white/10 dark:text-brand-200">
              <Users className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-bold text-ink-800 dark:text-white">{t('home.roommatesTitle')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-300">{t('home.roommatesBody')}</p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-800 dark:text-brand-200">
              {t('home.roommatesAction')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>
      <section id="propiedades" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <ListingsFeed mode="properties" />
      </section>
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

