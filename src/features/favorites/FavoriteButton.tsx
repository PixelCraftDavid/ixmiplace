import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from './useFavorites';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface Props {
  listingId: string;
  /** 'floating' lo coloca como overlay; 'inline' lo deja en el flujo */
  variant?: 'floating' | 'inline';
  /** 'light' para fondos claros, 'dark' para fondos oscuros/imágenes */
  tone?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export function FavoriteButton({
  listingId,
  variant = 'floating',
  tone = 'dark',
  size = 'md',
}: Props) {
  const { fbUser } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  const active = isFavorite(listingId);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }[size];

  const iconSize = {
    sm: 14,
    md: 18,
    lg: 22,
  }[size];

 async function handleClick(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();

  console.log('🔥 Click detectado, listingId:', listingId, 'fbUser:', fbUser?.uid);

  if (!fbUser) {
    console.log('🔥 No hay usuario, redirigiendo a login');
    nav('/login', { state: { from: loc } });
    return;
  }

  setBusy(true);
  try {
    console.log('🔥 Llamando a toggleFavorite...');
    await toggleFavorite(listingId);
    console.log('🔥 toggleFavorite completado sin errores');
  } catch (err) {
    console.error('🔥 Error toggling favorito:', err);
  } finally {
    setBusy(false);
  }
}

  const bg =
    tone === 'dark'
      ? 'bg-white/90 backdrop-blur-sm hover:bg-white shadow-md'
      : 'bg-cream-100 hover:bg-cream-200 ring-1 ring-cream-300';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={active ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      aria-pressed={active}
      className={`
        ${variant === 'floating' ? 'absolute right-3 top-3 z-10' : ''}
        ${sizeClasses}
        ${bg}
        flex items-center justify-center rounded-full
        transition-all duration-200
        hover:scale-110 active:scale-95
        disabled:opacity-60
      `}
    >
      <Heart
        size={iconSize}
        className={`
          transition-all duration-200
          ${
            active
              ? 'fill-red-500 text-red-500 scale-110'
              : 'text-ink-500 fill-transparent'
          }
        `}
      />
    </button>
  );
}