import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Map, Search, SlidersHorizontal, X } from 'lucide-react';
import { db } from '../../lib/firebase';
import { CATEGORIES, OPERATIONS } from '../../lib/constants';
import { ListingCard } from './ListingCard';
import { ListingsMap } from './ListingsMap';
import { useAuth } from '../auth/AuthContext';
import type { Listing, ListingCategory, ListingOperation } from '../../types/models';

type SortOption = 'recent' | 'price-asc' | 'price-desc';
type DateFilter = 'all' | 'today' | 'week' | 'month';

const SORTS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'price-asc', label: 'Menor precio' },
  { value: 'price-desc', label: 'Mayor precio' },
];

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: 'all', label: 'Cualquier fecha' },
  { value: 'today', label: 'Publicadas hoy' },
  { value: 'week', label: 'Últimos 7 días' },
  { value: 'month', label: 'Últimos 30 días' },
];

const PAGE_SIZE = 9;

export function ListingsFeed() {
  const { fbUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ListingCategory | 'all'>('all');
  const [operation, setOperation] = useState<ListingOperation | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    // 🔧 FIX: el efecto ahora depende de `fbUser`. Cuando cambia el estado
    // de autenticación (login/logout), el listener anterior se cierra
    // limpiamente y se crea uno nuevo desde cero, en vez de dejar que el
    // SDK de Firestore intente "resumir" la conexión anterior — que es lo
    // que puede disparar un permission-denied transitorio justo en el
    // instante del cambio de sesión, aunque la query en sí sea pública.
    setLoading(true);

    const q = query(
      collection(db, 'listings'),
      where('status', '==', 'published')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: Listing[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Listing, 'id'>),
        }));
        setListings(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error cargando feed:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [fbUser]);

  // Aplicar filtros + ordenar en memoria
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    let result = listings.filter(
      (listing) => !listing.expiresAt || listing.expiresAt > Date.now()
    );

    if (term) {
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(term) ||
          l.colonia.toLowerCase().includes(term) ||
          l.description.toLowerCase().includes(term)
      );
    }

    if (category !== 'all') {
      result = result.filter((l) => l.category === category);
    }

    if (operation !== 'all') {
      result = result.filter((l) => l.operation === operation);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const cutoff =
        dateFilter === 'today'
          ? startOfToday
          : Date.now() - (dateFilter === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000;

      result = result.filter((l) => l.createdAt >= cutoff);
    }

    // Ordenar
    const sorted = [...result];
    if (sort === 'recent') {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sort === 'price-asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      sorted.sort((a, b) => b.price - a.price);
    }

    return sorted;
  }, [listings, search, category, operation, sort, dateFilter]);

  const hasActiveFilters =
    search.length > 0 ||
    category !== 'all' ||
    operation !== 'all' ||
    dateFilter !== 'all';

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, category, operation, dateFilter, sort]);

  const visibleListings = filtered.slice(0, visibleCount);
  const hasMoreListings = visibleCount < filtered.length;

  function clearFilters() {
    setSearch('');
    setCategory('all');
    setOperation('all');
    setDateFilter('all');
  }

  return (
    <div className="space-y-6">
      {/* Header + Filtros */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">
              Propiedades en Ixmiquilpan
            </h2>
            <p className="mt-1 text-ink-500">
              {loading
                ? 'Cargando…'
                : `${filtered.length} ${
                    filtered.length === 1 ? 'propiedad' : 'propiedades'
                  } disponibles`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className={`flex items-center gap-2 self-start rounded-xl px-4 py-2.5
                        font-medium transition sm:self-auto
                        ${
                          showFilters || hasActiveFilters
                            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                            : 'bg-white text-ink-600 ring-1 ring-cream-300 hover:bg-cream-100'
                        }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
                {[category, operation, dateFilter].filter((f) => f !== 'all').length +
                  (search ? 1 : 0)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowMap((visible) => !visible)}
            className={`flex items-center gap-2 self-start rounded-xl px-4 py-2.5 font-medium transition sm:self-auto ${
              showMap
                ? 'bg-secondary-600 text-white shadow-md shadow-secondary-500/25'
                : 'bg-white text-ink-600 ring-1 ring-cream-300 hover:bg-cream-100'
            }`}
          >
            <Map className="h-4 w-4" />
            {showMap ? 'Ocultar mapa' : 'Ver mapa'}
          </button>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="space-y-4 rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Buscar por título, colonia o descripción…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-cream-300 bg-cream-50 py-2.5 pl-11 pr-4
                           text-ink placeholder-ink-400 transition
                           focus:border-brand-500 focus:bg-white focus:outline-none
                           focus:ring-4 focus:ring-brand-500/15"
              />
            </div>

            {/* Categoría + Operación + Fecha + Orden */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">
                  Fecha de publicación
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5
                             text-sm text-ink focus:border-brand-500 focus:bg-white
                             focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                >
                  {DATE_FILTERS.map((date) => (
                    <option key={date.value} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as ListingCategory | 'all')
                  }
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5
                             text-sm text-ink focus:border-brand-500 focus:bg-white
                             focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                >
                  <option value="all">Todas</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">
                  Operación
                </label>
                <select
                  value={operation}
                  onChange={(e) =>
                    setOperation(e.target.value as ListingOperation | 'all')
                  }
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5
                             text-sm text-ink focus:border-brand-500 focus:bg-white
                             focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                >
                  <option value="all">Todas</option>
                  {OPERATIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">
                  Ordenar
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5
                             text-sm text-ink focus:border-brand-500 focus:bg-white
                             focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-sm font-medium text-secondary-600
                           transition hover:text-secondary-700"
              >
                <X className="h-4 w-4" />
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {showMap && <ListingsMap listings={filtered} />}

      {/* Grid de resultados */}
      {loading ? (
        <FeedSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyFeed hasActiveFilters={hasActiveFilters} onClear={clearFilters} />
      ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {!loading && filtered.length > 0 && hasMoreListings && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="rounded-xl border border-cream-300 bg-white px-5 py-3 text-sm font-semibold text-ink-600 shadow-sm transition hover:bg-cream-100 hover:text-ink-800"
          >
            Cargar más propiedades
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Skeleton de carga
// ─────────────────────────────────────────────────
function FeedSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-sm"
        >
          <div className="aspect-[4/3] animate-pulse bg-cream-200" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-cream-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-cream-200" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-cream-200" />
            <div className="h-9 w-full animate-pulse rounded-xl bg-cream-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Estado vacío
// ─────────────────────────────────────────────────
function EmptyFeed({
  hasActiveFilters,
  onClear,
}: {
  hasActiveFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-500 ring-1 ring-brand-500/15">
        <Search className="h-9 w-9" />
      </div>

      <h3 className="mt-6 text-xl font-bold text-ink">
        {hasActiveFilters
          ? 'No encontramos propiedades'
          : 'Aún no hay propiedades publicadas'}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-ink-500">
        {hasActiveFilters
          ? 'Prueba ajustando los filtros o la búsqueda.'
          : 'Sé el primero en publicar una propiedad en Ixmiquilpan.'}
      </p>

      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500
                     px-5 py-3 font-semibold text-white shadow-lg shadow-brand-500/30
                     transition hover:bg-brand-600"
        >
          <X className="h-5 w-5" />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}