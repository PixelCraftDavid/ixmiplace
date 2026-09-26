import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext';
import { RequireAuth } from '../features/auth/RequireAuth';
import { RegisterPage } from '../features/auth/RegisterPage';
import { LoginPage } from '../features/auth/LoginPage';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage';
import { CompleteProfilePage } from '../features/auth/CompleteProfilePage';
import { CreateListingPage } from '../features/listings/CreateListingPage';
import { EditListingPage } from '../features/listings/EditListingPage';
import { MyListingsPage } from '../features/listings/MyListingsPage';
import { ListingDetailPage } from '../features/listings/ListingDetailPage';
import { ListingsFeed } from '../features/listings/ListingsFeed';
import { Navbar } from '../components/layout/Navbar';
import { Hero } from '../components/layout/Hero';
import { FavoritesPage } from '../features/favorites/FavoritesPage';
import { AdminPage } from '../features/admin/AdminPage';
import { NotificationsPage } from '../features/auth/NotificationsPage';
import { MessagesPage } from '../features/auth/MessagesPage';
import { ListingHistoryPage } from '../features/listings/ListingHistoryPage';
import { PublicProfilePage } from '../features/auth/PublicProfilePage';
import { SuspendedPage } from '../features/auth/SuspendedPage';
import { PrivacyNoticePage } from '../features/legal/PrivacyNoticePage';
import { TermsPage } from '../features/legal/TermsPage';
import { LegalAcceptancePage } from '../features/legal/LegalAcceptancePage';
import { SupportPage } from '../features/support/SupportPage';
import { SiteFooter } from '../components/layout/SiteFooter';

function HomePage() {
  return (
    <main className="min-h-screen bg-cream">
      <Hero />
      <section className="mx-auto -mt-8 mb-8 max-w-6xl px-4">
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 text-brand-950 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-100">
          <p className="font-semibold">IxmiPlace sigue en desarrollo y puedes probarlo.</p>
          <p className="mt-1 text-sm leading-relaxed opacity-80">Iremos sumando mejoras notables con el tiempo para acercar nuevas tecnologías a Ixmiquilpan.</p>
        </div>
      </section>
      <section id="propiedades" className="mx-auto max-w-6xl px-4 py-16">
        <ListingsFeed />
      </section>
    </main>
  );
}

export function AppRouter() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <a
          href="#main-content"
          className="sr-only z-50 rounded-lg bg-white px-4 py-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Saltar al contenido principal
        </a>
        <Navbar />
        <div id="main-content">
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/propietario/:id" element={<PublicProfilePage />} />
          <Route path="/cuenta-suspendida" element={<SuspendedPage />} />
          <Route path="/aviso-de-privacidad" element={<PrivacyNoticePage />} />
          <Route path="/terminos" element={<TermsPage />} />
          <Route path="/aceptar-terminos" element={<LegalAcceptancePage />} />
          <Route path="/apoyar" element={<SupportPage />} />

          {/* Protegidas */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/publicar" element={<CreateListingPage />} />
            <Route path="/editar/:id" element={<EditListingPage />} />
            <Route path="/mis-publicaciones" element={<MyListingsPage />} />
            <Route path="/favoritos" element={<FavoritesPage />} />
            <Route path="/notificaciones" element={<NotificationsPage />} />
            <Route path="/mensajes" element={<MessagesPage />} />
            <Route path="/historial/:id" element={<ListingHistoryPage />} />
            <Route path="/admin" element={<AdminPage />} />
            </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </div>
        <SiteFooter />
      </BrowserRouter>
    </AuthProvider>
  );
}
