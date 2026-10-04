import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { CircleAlert, Map, Search, SlidersHorizontal, X } from 'lucide-react';
import { db } from '../../lib/firebase';
import { CATEGORIES, OPERATIONS } from '../../lib/constants';
import { ListingCard } from './ListingCard';
import { ListingsMap } from './ListingsMap';
import { useAuth } from '../auth/AuthContext';
import type { Listing, ListingCategory, ListingOperation } from '../../types/models';
import { listingExpiryMillis } from '../../lib/listing-expiration';
import { useLanguage } from '@/lib/i18n';

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
const MAX_RETRIES = 3;

export function ListingsFeed() {
  const { fbUser } = useAuth();
  const { locale, t } = useLanguage();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  // Filtros
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ListingCategory | 'all'>('all');
  const [operation, setOperation] = useState<ListingOperation | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [roommateOnly, setRoommateOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [clock, setClock] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    setErrorDetail('');

    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let unsub: () => void = () => {};

    function subscribe(attempt: number) {
      // La regla pública se limita al estado publicado. La vigencia se
      // filtra localmente para no depender del reloj del dispositivo ni
      // del tipo histórico de expiresAt durante la autorización del query.
      const q = query(
        collection(db, 'listings'),
        where('status', '==', 'published')
      );

      unsub = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;

          const data: Listing[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Listing, 'id'>),
          }));

          setListings(data);
          setLoading(false);
          setLoadError(false);
          setErrorDetail('');

          console.log(
            `Listings cargados correctamente: ${snap.size}`
          );
        },
        (err) => {
          console.error(
            `Error cargando feed (intento ${attempt}):`,
            err
          );

          if (cancelled) return;

          if (attempt < MAX_RETRIES) {
            retryTimeout = setTimeout(() => {
              if (!cancelled) {
                subscribe(attempt + 1);
              }
            }, 500 * attempt);
          } else {
            setLoading(false);
            setLoadError(true);

            setErrorDetail(
              `${(err as { code?: string }).code || 'sin código'}: ${
                err.message || 'sin mensaje'
              }`
            );
          }
        }
      );
    }

    subscribe(1);

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
      unsub();
    };
  }, [fbUser, retryKey]);

  // Aplicar filtros + ordenar en memoria
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    // La vigencia oculta anuncios expirados en la interfaz. Las reglas
    // controlan que solo se lean anuncios publicados; para impedir también
    // la lectura directa de un anuncio vencido, debe archivarse en Firestore.
    let result = listings.filter((listing) => {
      const expiresAt = listingExpiryMillis(listing.expiresAt);
      return expiresAt !== null && expiresAt > clock;
    });

    // Búsqueda
    if (term) {
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(term) ||
          l.colonia.toLowerCase().includes(term) ||
          l.description.toLowerCase().includes(term)
      );
    }

    // Categoría
    if (category !== 'all') {
      result = result.filter(
        (l) => l.category === category
      );
    }

    // Operación
    if (operation !== 'all') {
      result = result.filter(
        (l) => l.operation === operation
      );
    }

    if (roommateOnly) result = result.filter((listing) => listing.roommateWanted === true);

    // Fecha
    if (dateFilter !== 'all') {
      const now = new Date();

      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();

      const cutoff =
        dateFilter === 'today'
          ? startOfToday
          : Date.now() -
            (dateFilter === 'week' ? 7 : 30) *
              24 *
              60 *
              60 *
              1000;

      result = result.filter(
        (l) => l.createdAt >= cutoff
      );
    }

    // Ordenar
    const sorted = [...result];

    if (sort === 'recent') {
      sorted.sort(
        (a, b) => b.createdAt - a.createdAt
      );
    } else if (sort === 'price-asc') {
      sorted.sort(
        (a, b) => a.price - b.price
      );
    } else if (sort === 'price-desc') {
      sorted.sort(
        (a, b) => b.price - a.price
      );
    }

    return sorted;
  }, [
    listings,
    clock,
    search,
    category,
    operation,
    sort,
    dateFilter,
    roommateOnly,
  ]);

  const hasActiveFilters =
    search.length > 0 ||
    category !== 'all' ||
    operation !== 'all' ||
    dateFilter !== 'all';
  const activeFilters = hasActiveFilters || roommateOnly;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [
    search,
    category,
    operation,
    dateFilter,
    roommateOnly,
    sort,
  ]);

  const visibleListings = filtered.slice(
    0,
    visibleCount
  );

  const hasMoreListings =
    visibleCount < filtered.length;

  function clearFilters() {
    setSearch('');
    setCategory('all');
    setOperation('all');
    setDateFilter('all');
    setRoommateOnly(false);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 border-b border-ink-700/10 pb-6 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-200">
            {t('feed.eyebrow')}
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-ink-800 dark:text-white sm:text-4xl">
            {t('feed.title')}
          </h2>
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-300 sm:text-base">
              {loadError
                ? t('feed.catalogError')
                : loading
                ? t('feed.loading')
                : `${filtered.length} ${
                    filtered.length === 1
                      ? t('feed.property')
                      : t('feed.properties')
                  } ${t('feed.available')}`}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-700/10 bg-white/70 px-3.5 py-2 text-xs font-medium text-ink-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-ink-200">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          {t('feed.community')}
        </span>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input
            type="search"
            aria-label={t('feed.searchLabel')}
            placeholder={t('feed.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 w-full rounded-xl border border-ink-700/15 bg-white pl-11 pr-4 text-sm text-ink-800 shadow-[0_2px_10px_rgba(27,32,24,0.035)] outline-none transition duration-200 placeholder:text-ink-400 hover:border-ink-700/25 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-white/10 dark:bg-[#242a22] dark:text-white dark:placeholder:text-ink-300"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            aria-expanded={showFilters}
            className={`motion-ease inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 active:translate-y-0 sm:flex-none ${showFilters || activeFilters ? 'border-brand-600 bg-brand-700 text-white hover:bg-brand-800' : 'border-ink-700/15 bg-white text-ink-700 hover:border-brand-500/50 hover:bg-cream-50 dark:border-white/10 dark:bg-[#242a22] dark:text-white dark:hover:bg-white/[0.08]'}`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {t('feed.filters')}
            {activeFilters && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
                {[category, operation, dateFilter].filter((f) => f !== 'all').length + (search ? 1 : 0) + (roommateOnly ? 1 : 0)}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowMap((visible) => !visible)}
            aria-pressed={showMap}
            className={`motion-ease inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 active:translate-y-0 sm:flex-none ${showMap ? 'border-ink-800 bg-ink-800 text-white hover:bg-ink-700' : 'border-ink-700/15 bg-white text-ink-700 hover:border-brand-500/50 hover:bg-cream-50 dark:border-white/10 dark:bg-[#242a22] dark:text-white dark:hover:bg-white/[0.08]'}`}
          >
            <Map className="h-4 w-4" aria-hidden="true" />
            {showMap ? t('feed.hideMap') : t('feed.showMap')}
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="space-y-4 rounded-2xl border border-ink-700/10 bg-white p-4 shadow-[0_8px_28px_rgba(27,32,24,0.055)] dark:border-white/10 dark:bg-[#242a22] sm:p-5">

            {/* Categoría + Operación + Fecha + Orden */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Fecha */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">
                  {locale === 'es' ? 'Fecha de publicación' : locale === 'en' ? 'Posting date' : t('feed.dateLabel')}
                </label>

                <select
                  value={dateFilter}
                  onChange={(e) =>
                    setDateFilter(
                      e.target.value as DateFilter
                    )
                  }
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5
                             text-sm text-ink focus:border-brand-500 focus:bg-white
                             focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                >
                  {DATE_FILTERS.map(
                    (date) => (
                      <option
                        key={date.value}
                        value={date.value}
                      >
                        {locale === 'es' ? date.label : locale === 'en' ? ({ all: 'Any time', today: 'Posted today', week: 'Last 7 days', month: 'Last 30 days' } as const)[date.value] : ({ all: 'Mädi', today: 'Bi t’ot’e n’a pa', week: 'Nja 7 pa', month: 'Nja 30 pa' } as const)[date.value]}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">
                  {locale === 'en' ? 'Category' : 'Categoría'}
                </label>

                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value as
                        | ListingCategory
                        | 'all'
                    )
                  }
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5
                             text-sm text-ink focus:border-brand-500 focus:bg-white
                             focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                >
                  <option value="all">
                    {t('feed.all')}
                  </option>

                  {CATEGORIES.map((c) => (
                    <option
                      key={c.value}
                      value={c.value}
                    >
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Operación */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">
                  {locale === 'en' ? 'Listing type' : 'Operación'}
                </label>

                <select
                  value={operation}
                  onChange={(e) =>
                    setOperation(
                      e.target.value as
                        | ListingOperation
                        | 'all'
                    )
                  }
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5
                             text-sm text-ink focus:border-brand-500 focus:bg-white
                             focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                >
                  <option value="all">
                    {t('feed.all')}
                  </option>

                  {OPERATIONS.map((o) => (
                    <option
                      key={o.value}
                      value={o.value}
                    >
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ordenar */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-500">
                  {t('feed.sort')}
                </label>

                <select
                  value={sort}
                  onChange={(e) =>
                    setSort(
                      e.target.value as SortOption
                    )
                  }
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5
                             text-sm text-ink focus:border-brand-500 focus:bg-white
                             focus:outline-none focus:ring-4 focus:ring-brand-500/15"
                >
                  {SORTS.map((s) => (
                    <option
                      key={s.value}
                      value={s.value}
                    >
                      {locale === 'es' ? s.label : locale === 'en' ? ({ recent: 'Newest', 'price-asc': 'Lowest price', 'price-desc': 'Highest price' } as const)[s.value] : ({ recent: 'Mä ra ñäts’i', 'price-asc': 'Nja ma hmädi', 'price-desc': 'Nja ma m’ui' } as const)[s.value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700 dark:text-white">
              <input type="checkbox" checked={roommateOnly} onChange={(event) => setRoommateOnly(event.target.checked)} className="h-4 w-4 accent-brand-600" />
              {t('feed.roommateOnly')}
            </label>

            {activeFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="motion-ease inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 transition duration-200 hover:text-brand-900 dark:text-brand-200 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
                {t('feed.clearFilters')}
              </button>
            )}
        </div>
      )}

      {/* Mapa */}
      {showMap && (
        <ListingsMap listings={filtered} />
      )}

      {/* Grid de resultados */}
      {loading ? (
        <FeedSkeleton />
      ) : loadError ? (
        <ErrorFeed
          onRetry={() =>
            setRetryKey((k) => k + 1)
          }
          detail={errorDetail}
        />
      ) : filtered.length === 0 ? (
        <EmptyFeed
          hasActiveFilters={activeFilters}
          onClear={clearFilters}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {visibleListings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
            />
          ))}
        </div>
      )}

      {/* Cargar más */}
      {!loading &&
        filtered.length > 0 &&
        hasMoreListings && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() =>
                setVisibleCount(
                  (count) =>
                    count + PAGE_SIZE
                )
              }
              className="rounded-xl border border-cream-300 bg-white px-5 py-3 text-sm font-semibold text-ink-600 shadow-sm transition hover:bg-cream-100 hover:text-ink-800"
            >
              {t('feed.loadMore')}
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
      {Array.from({ length: 6 }).map(
        (_, i) => (
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
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Estado de error
// ─────────────────────────────────────────────────

function ErrorFeed({
  onRetry,
  detail,
}: {
  onRetry: () => void;
  detail?: string;
}) {
  return (
    <div className="rounded-3xl border border-ink-700/10 bg-white/65 px-6 py-12 text-center shadow-[0_10px_32px_rgba(27,32,24,0.04)] dark:border-white/10 dark:bg-white/[0.035] sm:px-10 sm:py-16">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-700/15 bg-amber-500/10 text-amber-800 dark:border-amber-200/15 dark:text-amber-200">
        <CircleAlert className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">Catálogo temporalmente inaccesible</p>
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink-800 dark:text-white sm:text-2xl">
        No pudimos traer las propiedades.
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500 dark:text-ink-300">
        Puede ser una interrupción breve. Vuelve a intentarlo en un momento.
      </p>

      <div className="mt-6 flex flex-col items-center gap-4">
        <button
          onClick={onRetry}
          className="motion-ease min-h-11 rounded-xl bg-[#344a36] px-5 py-2.5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#293d2d] active:translate-y-0 dark:bg-[#597657] dark:hover:bg-[#668563]"
        >
          Reintentar
        </button>
        {detail && (
          <details className="max-w-full text-left text-xs text-ink-400 dark:text-ink-300">
            <summary className="cursor-pointer rounded-md px-2 py-1 transition hover:bg-ink-700/[0.04] hover:text-ink-600 dark:hover:bg-white/[0.05] dark:hover:text-white">
              Ver información de diagnóstico
            </summary>
            <p className="mt-2 max-w-xl break-words rounded-lg border border-ink-700/10 bg-ink-700/[0.025] p-3 font-mono leading-5 dark:border-white/10 dark:bg-white/[0.035]">
              {detail}
            </p>
          </details>
        )}
      </div>
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
    <div className="rounded-3xl border border-ink-700/10 bg-white/65 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.035] sm:px-10 sm:py-16">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-700/10 bg-brand-700/[0.06] text-brand-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-brand-200">
        <Search className="h-5 w-5" aria-hidden="true" />
      </div>

      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-200">Explora sin prisa</p>
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-ink-800 dark:text-white sm:text-2xl">
        {hasActiveFilters
          ? 'No encontramos propiedades'
          : 'Aún no hay propiedades publicadas'}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-500 dark:text-ink-300">
        {hasActiveFilters
          ? 'Prueba ajustando los filtros o la búsqueda.'
          : 'Sé el primero en publicar una propiedad en Ixmiquilpan.'}
      </p>

      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="motion-ease mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#344a36] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#293d2d] active:translate-y-0 dark:bg-[#597657] dark:hover:bg-[#668563]"
        >
          <X className="h-5 w-5" />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
