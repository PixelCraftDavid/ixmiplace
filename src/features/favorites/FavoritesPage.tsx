import { Link } from 'react-router-dom';
import { Heart, Loader2, Search } from 'lucide-react';
import { ListingCard } from '../listings/ListingCard';
import { useFavoriteListings } from './useFavorites';

export function FavoritesPage() {
  const { listings, loading } = useFavoriteListings();

  return (
    <div className="min-h-screen bg-cream pt-24 pb-16">
      <div className="mx-auto max-w-6xl px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-ink sm:text-4xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl
                             bg-red-50 text-red-500">
              <Heart className="h-6 w-6 fill-current" />
            </span>
            Mis favoritos
          </h1>
          <p className="mt-2 text-ink-500">
            {loading
              ? 'Cargando…'
              : listings.length === 0
              ? 'Aún no has guardado propiedades'
              : `${listings.length} ${
                  listings.length === 1
                    ? 'propiedad guardada'
                    : 'propiedades guardadas'
                }`}
          </p>
          {!loading && listings.length > 0 && (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-600">
              Ordenados por guardado más reciente
            </p>
          )}
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-ink-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm">Cargando favoritos…</p>
          </div>
        ) : listings.length === 0 ? (
          <EmptyFavorites />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Estado vacío
// ─────────────────────────────────────────────────
function EmptyFavorites() {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full
                      bg-red-50 text-red-400">
        <Heart className="h-9 w-9" />
      </div>

      <h3 className="mt-6 text-xl font-bold text-ink">
        No tienes favoritos todavía
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-ink-500">
        Explora las propiedades disponibles y guarda las que más te gusten
        tocando el corazón ❤️
      </p>

      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500
                   px-5 py-3 font-semibold text-white shadow-lg shadow-brand-500/30
                   transition hover:bg-brand-600"
      >
        <Search className="h-5 w-5" />
        Explorar propiedades
      </Link>
    </div>
  );
}