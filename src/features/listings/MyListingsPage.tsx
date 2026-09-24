import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { Plus, Home, Loader2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import type { Listing, ListingStatus } from '../../types/models';
import { ListingCardMine } from './ListingCardMine';

type FilterTab = 'all' | ListingStatus;

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all',       label: 'Todas' },
  { value: 'pending',   label: 'En revisión' },
  { value: 'published', label: 'Publicadas' },
  { value: 'rejected',  label: 'Rechazadas' },
  { value: 'archived',  label: 'Archivadas' },
];

export function MyListingsPage() {
  const { fbUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    if (!fbUser) return;

    setLoading(true);

    // Query: todas las publicaciones del usuario actual
    const q = query(
      collection(db, 'listings'),
      where('ownerId', '==', fbUser.uid),
      orderBy('createdAt', 'desc')
    );

    // onSnapshot = actualización en tiempo real
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
        console.error('Error cargando mis publicaciones:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [fbUser]);

  // Filtrado local por tab
  const filtered =
    activeTab === 'all'
      ? listings
      : listings.filter((l) => l.status === activeTab);

  // Conteos por tab
  const counts: Record<FilterTab, number> = {
    all: listings.length,
    pending: listings.filter((l) => l.status === 'pending').length,
    published: listings.filter((l) => l.status === 'published').length,
    rejected: listings.filter((l) => l.status === 'rejected').length,
    archived: listings.filter((l) => l.status === 'archived').length,
    draft: 0,
  };

  return (
    <div className="min-h-screen bg-cream pt-24 pb-16">
      <div className="mx-auto max-w-5xl px-4 py-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">
              Mis publicaciones
            </h1>
            <p className="mt-1 text-ink-500">
              Administra tus propiedades publicadas en IxmiPlace
            </p>
          </div>

          <Link
            to="/publicar"
            className="inline-flex items-center justify-center gap-2 self-start
                       rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white
                       shadow-lg shadow-brand-500/30 transition
                       hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/40
                       sm:self-auto"
          >
            <Plus className="h-5 w-5" />
            Publicar nueva
          </Link>
        </div>

        {/* Tabs de filtro */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            const count = counts[tab.value];
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`
                  flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                      : 'bg-white text-ink-600 ring-1 ring-cream-300 hover:bg-cream-100 hover:text-ink-700'
                  }
                `}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`
                      rounded-full px-1.5 py-0.5 text-[10px] font-bold
                      ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-cream-200 text-ink-500'
                      }
                    `}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-ink-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm">Cargando publicaciones…</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasListings={listings.length > 0} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((listing) => (
              <ListingCardMine key={listing.id} listing={listing} />
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
function EmptyState({ hasListings }: { hasListings: boolean }) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-500 ring-1 ring-brand-500/15">
        <Home className="h-9 w-9" />
      </div>

      <h3 className="mt-6 text-xl font-bold text-ink">
        {hasListings
          ? 'No hay publicaciones en este filtro'
          : 'Aún no tienes publicaciones'}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-ink-500">
        {hasListings
          ? 'Prueba con otro filtro o publica una nueva propiedad.'
          : 'Cuando publiques una propiedad, aparecerá aquí para que la administres.'}
      </p>

      <Link
        to="/publicar"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500
                   px-5 py-3 font-semibold text-white shadow-lg shadow-brand-500/30
                   transition hover:bg-brand-600"
      >
        <Plus className="h-5 w-5" />
        Publicar mi primera propiedad
      </Link>
    </div>
  );
}