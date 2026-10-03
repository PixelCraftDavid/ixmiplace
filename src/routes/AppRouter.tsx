import { BrowserRouter, Routes, Route } from 'react-router-dom';

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

function HomePage() {
  return (
    <main className="min-h-screen bg-cream">
      <Hero />

      <section id="propiedades" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <ListingsFeed />
      </section>
    </main>
  );
}

export function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteMetadata />
        <AnalyticsConsent />
        <a
          href="#main-content"
          className="sr-only z-50 rounded-lg bg-white px-4 py-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Saltar al contenido principal
        </a>

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
      </BrowserRouter>
    </AuthProvider>
  );
}

