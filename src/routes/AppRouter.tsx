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

function HomePage() {
  return (
    <main className="min-h-screen bg-cream">
      <Hero />
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
      </BrowserRouter>
    </AuthProvider>
  );
}