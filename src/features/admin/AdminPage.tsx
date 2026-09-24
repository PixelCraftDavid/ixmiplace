import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  Clock3,
  Eye,
  Loader2,
  Search,
  ShieldCheck,
  X,
  MessageCircle,
  BarChart3,
  Ban,
  UserCheck,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  writeBatch,
  collection as firestoreCollection,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { categoryEmoji, operationLabel, priceUnitLabel } from '../../lib/constants';
import { formatPrice } from '../../lib/utils';
import type { AppUser, Listing, ListingStatus, Report } from '../../types/models';

type AdminFilter = 'all' | 'pending' | 'published' | 'rejected' | 'archived';

const FILTERS: { value: AdminFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'En revisión' },
  { value: 'published', label: 'Publicadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'archived', label: 'Archivadas' },
];

const statusLabel: Record<ListingStatus, string> = {
  draft: 'Borrador',
  pending: 'En revisión',
  published: 'Publicada',
  rejected: 'Rechazada',
  archived: 'Archivada',
};

const statusClass: Record<ListingStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-50 text-amber-700',
  published: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  archived: 'bg-cream-200 text-ink-600',
};

export function AdminPage() {
  const { profile, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<AdminFilter>('pending');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');
  const [reportBusyId, setReportBusyId] = useState('');
  const [rejecting, setRejecting] = useState<Listing | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;

    const listingsQuery = query(
      collection(db, 'listings'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeListings = onSnapshot(
      listingsQuery,
      (snapshot) => {
        setListings(
          snapshot.docs.map((listingDoc) => ({
            id: listingDoc.id,
            ...(listingDoc.data() as Omit<Listing, 'id'>),
          }))
        );
        setLoading(false);
      },
      (snapshotError) => {
        console.error('Error cargando panel de administración:', snapshotError);
        setError('No se pudieron cargar las publicaciones. Revisa tus permisos.');
        setLoading(false);
      }
    );

    const reportsQuery = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeReports = onSnapshot(
      reportsQuery,
      (snapshot) => {
        setReports(
          snapshot.docs.map((reportDoc) => ({
            id: reportDoc.id,
            ...(reportDoc.data() as Omit<Report, 'id'>),
          }))
        );
      },
      (snapshotError) => {
        console.error('Error cargando reportes:', snapshotError);
        setError('No se pudieron cargar los reportes.');
      }
    );

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map((userDoc) => userDoc.data() as AppUser));
    });

    return () => {
      unsubscribeListings();
      unsubscribeReports();
      unsubscribeUsers();
    };
  }, [profile]);

  const counts = useMemo(
    () => ({
      all: listings.length,
      pending: listings.filter((listing) => listing.status === 'pending').length,
      published: listings.filter((listing) => listing.status === 'published').length,
      rejected: listings.filter((listing) => listing.status === 'rejected').length,
      archived: listings.filter((listing) => listing.status === 'archived').length,
    }),
    [listings]
  );

  const statistics = useMemo(
    () => ({
      views: listings.reduce((total, listing) => total + (listing.viewsCount ?? 0), 0),
      contacts: listings.reduce(
        (total, listing) => total + (listing.whatsappContactsCount ?? 0),
        0
      ),
      openReports: reports.filter((report) => report.status === 'open').length,
    }),
    [listings, reports]
  );

  const filteredListings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesFilter = filter === 'all' || listing.status === filter;
      const matchesSearch =
        !normalizedSearch ||
        listing.title.toLowerCase().includes(normalizedSearch) ||
        listing.colonia.toLowerCase().includes(normalizedSearch) ||
        listing.ownerId.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });
  }, [filter, listings, search]);

  if (authLoading) return null;
  if (!profile || profile.role !== 'admin') return <Navigate to="/" replace />;
  const adminUid = profile.uid;

  async function updateListingStatus(
    listing: Listing,
    status: ListingStatus,
    reason?: string
  ) {
    setBusyId(listing.id);
    setError('');
    try {
      const updates: Record<string, unknown> = {
        status,
        updatedAt: Date.now(),
      };

      if (status === 'published') {
        updates.approvedBy = adminUid;
        updates.approvedAt = Date.now();
        updates.rejectionReason = null;
      }

      if (status === 'rejected') {
        updates.rejectionReason = reason?.trim() || 'No cumple con los requisitos de publicación.';
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'listings', listing.id), updates);
      const notificationRef = doc(firestoreCollection(db, 'notifications'));
      batch.set(notificationRef, {
        recipientId: listing.ownerId,
        type: status === 'published' ? 'listing_approved' : 'listing_rejected',
        title: status === 'published' ? 'Publicación aprobada' : 'Publicación rechazada',
        message:
          status === 'published'
            ? `Tu publicación "${listing.title}" ya está visible en IxmiPlace.`
            : `Tu publicación "${listing.title}" necesita cambios: ${updates.rejectionReason}`,
        listingId: listing.id,
        isRead: false,
        createdAt: Date.now(),
      });
      const historyRef = doc(firestoreCollection(db, 'listingHistory'));
      batch.set(historyRef, {
        listingId: listing.id,
        actorId: adminUid,
        actorRole: 'admin',
        action: status === 'published' ? 'approved' : 'rejected',
        changedFields: ['status', ...(status === 'rejected' ? ['rejectionReason'] : [])],
        summary: status === 'published' ? 'El administrador aprobó la publicación.' : 'El administrador rechazó la publicación.',
        createdAt: Date.now(),
      });
      await batch.commit();
      setRejecting(null);
      setRejectionReason('');
    } catch (updateError) {
      console.error('Error actualizando publicación:', updateError);
      setError('No se pudo guardar el cambio. Verifica las reglas de Firestore.');
    } finally {
      setBusyId('');
    }
  }

  async function updateReportStatus(report: Report, status: Report['status']) {
    setReportBusyId(report.id);
    setError('');
    try {
      await updateDoc(doc(db, 'reports', report.id), {
        status,
        reviewedAt: Date.now(),
        reviewedBy: adminUid,
      });
    } catch (reportError) {
      console.error('Error actualizando reporte:', reportError);
      setError('No se pudo actualizar el reporte.');
    } finally {
      setReportBusyId('');
    }
  }

  async function toggleUserSuspension(user: AppUser) {
    if (user.uid === adminUid) return;
    try {
      const isBanned = !user.isBanned;
      await updateDoc(doc(db, 'users', user.uid), { isBanned });
      await updateDoc(doc(db, 'publicProfiles', user.uid), { isBanned });
    } catch (userError) {
      console.error('Error actualizando suspensión:', userError);
      setError('No se pudo actualizar el estado del usuario.');
    }
  }

  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24">
      <div className="mx-auto max-w-7xl py-8">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Espacio privado
            </div>
            <h1 className="text-3xl font-extrabold text-ink sm:text-4xl">Panel de administrador</h1>
            <p className="mt-2 text-ink-500">Modera las propiedades antes de que lleguen al público.</p>
          </div>

          <label className="relative block w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, zona o propietario"
              className="w-full rounded-xl border border-cream-300 bg-white py-3 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
            />
          </label>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Metric icon={<Clock3 />} label="En revisión" value={counts.pending} tone="amber" />
          <Metric icon={<Check />} label="Publicadas" value={counts.published} tone="green" />
          <Metric icon={<AlertCircle />} label="Rechazadas" value={counts.rejected} tone="red" />
          <Metric icon={<Eye />} label="Visitas" value={statistics.views} tone="blue" />
          <Metric icon={<MessageCircle />} label="Contactos" value={statistics.contacts} tone="blue" />
          <Metric icon={<AlertCircle />} label="Reportes abiertos" value={statistics.openReports} tone="red" />
        </section>

        <AdminAnalytics listings={listings} />

        <section className="mb-8 rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-ink">Usuarios</h2><p className="mt-1 text-xs text-ink-400">Control de cuentas suspendidas</p></div><UserCheck className="h-5 w-5 text-brand-500" /></div>
          <div className="space-y-3">{users.map((user) => <div key={user.uid} className="flex flex-col gap-3 rounded-xl border border-cream-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{user.displayName}</p><p className="truncate text-xs text-ink-400">{user.email}</p></div><button type="button" disabled={user.uid === adminUid} onClick={() => void toggleUserSuspension(user)} className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${user.isBanned ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>{user.isBanned ? <><UserCheck className="h-4 w-4" /> Reactivar</> : <><Ban className="h-4 w-4" /> Suspender</>}</button></div>)}</div>
        </section>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === item.value
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                  : 'bg-white text-ink-600 ring-1 ring-cream-300 hover:bg-cream-100'
              }`}
            >
              {item.label} <span className="ml-1 opacity-70">{counts[item.value]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-24 text-ink-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm">Cargando moderación…</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="rounded-2xl border border-cream-200 bg-white p-12 text-center shadow-sm">
            <ShieldCheck className="mx-auto h-10 w-10 text-brand-400" />
            <h2 className="mt-4 text-xl font-bold text-ink">No hay resultados</h2>
            <p className="mt-2 text-sm text-ink-500">No hay publicaciones que coincidan con este filtro.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map((listing) => (
              <AdminListingRow
                key={listing.id}
                listing={listing}
                busy={busyId === listing.id}
                onApprove={() => void updateListingStatus(listing, 'published')}
                onReject={() => {
                  setRejecting(listing);
                  setRejectionReason('');
                }}
                onReview={() => void updateListingStatus(listing, 'pending')}
              />
            ))}
          </div>
        )}

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-ink">Reportes de la comunidad</h2>
              <p className="mt-1 text-sm text-ink-500">
                {reports.filter((report) => report.status === 'open').length} reportes pendientes de revisión
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-2xl border border-cream-200 bg-white p-8 text-center text-sm text-ink-500 shadow-sm">
              Todavía no hay reportes.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const reportedListing = listings.find((listing) => listing.id === report.listingId);
                return (
                  <ReportRow
                    key={report.id}
                    report={report}
                    listingTitle={reportedListing?.title ?? 'Publicación eliminada'}
                    busy={reportBusyId === report.id}
                    onReview={() => void updateReportStatus(report, 'reviewed')}
                    onDismiss={() => void updateReportStatus(report, 'dismissed')}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-cream-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-600">Rechazar publicación</p>
                <h2 className="mt-1 text-xl font-bold text-ink">{rejecting.title}</h2>
              </div>
              <button type="button" onClick={() => setRejecting(null)} className="rounded-full p-2 text-ink-400 hover:bg-cream-100" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="mt-5 block text-sm font-semibold text-ink-700">
              Motivo para el propietario
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                rows={4}
                placeholder="Explica qué debe corregir…"
                className="mt-2 w-full resize-none rounded-xl border border-cream-300 bg-cream-50 p-3 font-normal text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
              />
            </label>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setRejecting(null)} className="flex-1 rounded-xl border border-cream-300 px-4 py-3 font-semibold text-ink-600 hover:bg-cream-100">
                Cancelar
              </button>
              <button type="button" onClick={() => void updateListingStatus(rejecting, 'rejected', rejectionReason)} disabled={busyId === rejecting.id} className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'amber' | 'green' | 'red' | 'blue' }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-sky-50 text-sky-600',
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div><p className="text-sm text-ink-500">{label}</p><p className="text-2xl font-extrabold text-ink">{value}</p></div>
    </div>
  );
}

function AdminListingRow({ listing, busy, onApprove, onReject, onReview }: { listing: Listing; busy: boolean; onApprove: () => void; onReject: () => void; onReview: () => void }) {
  return (
    <article className="grid gap-4 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm md:grid-cols-[9rem_1fr_auto] md:items-center">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-cream-100">
        {listing.photos[0] ? <img src={listing.photos[0]} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-ink-400">Sin imagen</div>}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[listing.status]}`}>{statusLabel[listing.status]}</span>
          <span className="text-xs text-ink-400">{new Date(listing.createdAt).toLocaleDateString('es-MX')}</span>
        </div>
        <h2 className="mt-2 truncate text-lg font-bold text-ink">{categoryEmoji(listing.category)} {listing.title}</h2>
        <p className="mt-1 text-sm text-ink-500">{listing.colonia} · {operationLabel(listing.operation)} · {formatPrice(listing.price)} {priceUnitLabel(listing.priceUnit)}</p>
        <p className="mt-1 truncate text-xs text-ink-400">Propietario: {listing.ownerId}</p>
        {listing.rejectionReason && <p className="mt-2 text-xs text-red-600">Motivo: {listing.rejectionReason}</p>}
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <a href={`/listing/${listing.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-cream-300 px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-cream-100"><Eye className="h-4 w-4" /> Ver</a>
        {listing.status !== 'published' && <button type="button" onClick={onApprove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><Check className="h-4 w-4" /> Aprobar</button>}
        {listing.status !== 'rejected' && <button type="button" onClick={onReject} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"><X className="h-4 w-4" /> Rechazar</button>}
        {listing.status === 'rejected' && <button type="button" onClick={onReview} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"><Clock3 className="h-4 w-4" /> Revisar de nuevo</button>}
      </div>
    </article>
  );
}

function ReportRow({
  report,
  listingTitle,
  busy,
  onReview,
  onDismiss,
}: {
  report: Report;
  listingTitle: string;
  busy: boolean;
  onReview: () => void;
  onDismiss: () => void;
}) {
  const reasonLabels: Record<Report['reason'], string> = {
    spam: 'Spam o publicidad',
    fraude: 'Posible fraude',
    no_existe: 'La propiedad no existe',
    duplicado: 'Publicación duplicada',
    otro: 'Otro motivo',
  };
  const statusLabels: Record<Report['status'], string> = {
    open: 'Pendiente',
    reviewed: 'Revisado',
    dismissed: 'Descartado',
  };
  const statusStyles: Record<Report['status'], string> = {
    open: 'bg-amber-50 text-amber-700',
    reviewed: 'bg-emerald-50 text-emerald-700',
    dismissed: 'bg-slate-100 text-slate-600',
  };

  return (
    <article className="rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[report.status]}`}>
              {statusLabels[report.status]}
            </span>
            <span className="text-xs text-ink-400">{new Date(report.createdAt).toLocaleString('es-MX')}</span>
          </div>
          <h3 className="mt-2 font-bold text-ink">{listingTitle}</h3>
          <p className="mt-1 text-sm font-medium text-red-600">{reasonLabels[report.reason]}</p>
          {report.comment && <p className="mt-2 text-sm leading-relaxed text-ink-600">“{report.comment}”</p>}
          <p className="mt-2 truncate text-xs text-ink-400">Reportante: {report.reporterId}</p>
        </div>
        {report.status === 'open' && (
          <div className="flex flex-shrink-0 gap-2">
            <button type="button" onClick={onDismiss} disabled={busy} className="rounded-lg border border-cream-300 px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-cream-100 disabled:opacity-60">Descartar</button>
            <button type="button" onClick={onReview} disabled={busy} className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">Marcar revisado</button>
          </div>
        )}
      </div>
    </article>
  );
}

function AdminAnalytics({ listings }: { listings: Listing[] }) {
  const total = Math.max(listings.length, 1);
  const published = listings.filter((listing) => listing.status === 'published').length;
  const pending = listings.filter((listing) => listing.status === 'pending').length;
  const rejected = listings.filter((listing) => listing.status === 'rejected').length;
  const archived = listings.filter((listing) => listing.status === 'archived').length;
  const topListings = [...listings]
    .sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0))
    .slice(0, 5);
  const maxViews = Math.max(...topListings.map((listing) => listing.viewsCount ?? 0), 1);
  const publishedAngle = (published / total) * 360;
  const pendingAngle = (pending / total) * 360;
  const rejectedAngle = (rejected / total) * 360;

  return (
    <section className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-bold text-ink">Estado del inventario</h2><p className="mt-1 text-xs text-ink-400">Distribución de tus publicaciones</p></div>
          <BarChart3 className="h-5 w-5 text-brand-500" />
        </div>
        <div className="mt-6 flex items-center gap-6">
          <div className="relative h-36 w-36 flex-shrink-0 rounded-full" style={{ background: `conic-gradient(#52634A 0deg ${publishedAngle}deg, #D49A4A ${publishedAngle}deg ${publishedAngle + pendingAngle}deg, #dc2626 ${publishedAngle + pendingAngle}deg ${publishedAngle + pendingAngle + rejectedAngle}deg, #94a3b8 ${publishedAngle + pendingAngle + rejectedAngle}deg 360deg)` }}>
            <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white text-center"><span className="text-2xl font-extrabold text-ink">{listings.length}</span><span className="text-[10px] uppercase tracking-wide text-ink-400">anuncios</span></div>
          </div>
          <div className="space-y-3 text-sm">
            <Legend color="bg-brand-500" label="Publicadas" value={published} />
            <Legend color="bg-accent-500" label="En revisión" value={pending} />
            <Legend color="bg-red-600" label="Rechazadas" value={rejected} />
            <Legend color="bg-slate-400" label="Archivadas" value={archived} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-ink">Rendimiento por anuncio</h2><p className="mt-1 text-xs text-ink-400">Publicaciones con más visitas</p></div><span className="text-xs font-semibold text-ink-400">Visitas</span></div>
        <div className="mt-5 space-y-4">
          {topListings.length === 0 ? <p className="py-8 text-center text-sm text-ink-400">Aún no hay datos suficientes.</p> : topListings.map((listing) => { const views = listing.viewsCount ?? 0; return <div key={listing.id}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate font-semibold text-ink-600">{listing.title}</span><span className="flex-shrink-0 font-bold text-brand-600">{views}</span></div><div className="h-2 overflow-hidden rounded-full bg-cream-200"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max((views / maxViews) * 100, views > 0 ? 4 : 0)}%` }} /></div><p className="mt-1 text-[11px] text-ink-400">{listing.whatsappContactsCount ?? 0} contactos por WhatsApp</p></div>; })}
        </div>
      </div>
    </section>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span className="text-ink-500">{label}</span><strong className="ml-auto text-ink">{value}</strong></div>;
}