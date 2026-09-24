import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { HouseLoader } from '../../components/ui/HouseLoader';

interface Props {
  requireVerified?: boolean;
}

export function RequireAuth({ requireVerified = true }: Props) {
  const { fbUser, profile, loading } = useAuth();
  const loc = useLocation();

  // 1. Cargando sesión — primera vez de la app
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <HouseLoader
          variant="building"
          size="lg"
          message="Preparando IxmiPlace…"
        />
      </div>
    );
  }

  // 2. No logueado
  if (!fbUser) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  // 3. Correo no verificado
  if (requireVerified && !fbUser.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  // 4. Perfil aún no cargado
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <HouseLoader variant="line" size="md" message="Cargando perfil…" />
      </div>
    );
  }

  if (profile.isBanned && loc.pathname !== '/cuenta-suspendida') {
    return <Navigate to="/cuenta-suspendida" replace />;
  }

  // 5. Sin teléfono → completar perfil
  if (!profile.phone && loc.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
}