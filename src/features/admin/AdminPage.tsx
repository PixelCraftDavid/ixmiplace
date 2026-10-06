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
  BarChart3,
  Ban,
  UserCheck,
  Trash2,
  LayoutDashboard,
  Building2,
  Flag,
  UsersRound,
  Wrench,
  ArrowUpRight,
  Megaphone,
} from 'lucide-react';
import {
  collection,
  deleteField,
  getDocs,
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
import { requestPushDelivery } from '../../lib/push-notifications';
import { migratePrivateContacts } from '../../lib/contact-migration';
import { postProtectedApi } from '../../lib/protected-api';
import { BusinessAdsAdmin } from './BusinessAdsAdmin';

type AdminFilter = 'all' | 'pending' | 'published' | 'rejected' | 'archived';
type AdminSection = 'overview' | 'listings' | 'ads' | 'reports' | 'users' | 'tools';

function sectionHeading(section: AdminSection) {
  const headings: Record<AdminSection, { title: string; description: string }> = {
    overview: { title: 'Panel de administración', description: 'Una vista rápida de la actividad y las tareas pendientes.' },
    listings: { title: 'Publicaciones', description: 'Busca, filtra y modera los anuncios de IxmiPlace.' },
    ads: { title: 'Publicidad local', description: 'Gestiona campañas, espacios disponibles y métricas agregadas.' },
    reports: { title: 'Reportes', description: 'Revisa los avisos de la comunidad y registra una resolución.' },
    users: { title: 'Usuarios', description: 'Consulta cuentas y administra suspensiones.' },
    tools: { title: 'Herramientas', description: 'Tareas de mantenimiento que se ejecutan manualmente.' },
  };
  return headings[section];
}

const ADMIN_SECTIONS: { id: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'listings', label: 'Publicaciones', icon: Building2 },
  { id: 'ads', label: 'Publicidad', icon: Megaphone },
  { id: 'reports', label: 'Reportes', icon: Flag },
  { id: 'users', label: 'Usuarios', icon: UsersRound },
  { id: 'tools', label: 'Herramientas', icon: Wrench },
];

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
  const [deleting, setDeleting] = useState<Listing | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState('');
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupSummary, setCleanupSummary] = useState('');
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');

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
      openReports: reports.filter((report) => report.status === 'open').length,
    }),
    [reports]
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

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return reports.filter((report) => {
      if (!normalizedSearch) return true;
      const listing = listings.find((item) => item.id === report.listingId);
      return [
        report.comment,
        report.reason,
        report.reporterId,
        listing?.title,
        report.listingId,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [listings, reports, search]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => !normalizedSearch || [
      user.displayName,
      user.email,
      user.uid,
    ].some((value) => value?.toLowerCase().includes(normalizedSearch)));
  }, [users, search]);

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
            : `Motivo para el propietario: ${updates.rejectionReason}`,
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
      await requestPushDelivery('notification_created', notificationRef.id);
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
      const batch = writeBatch(db);
      batch.update(doc(db, 'users', user.uid), { isBanned });
      const publicProfileRef = doc(db, 'publicProfiles', user.uid);
      if (isBanned) {
        batch.delete(publicProfileRef);
      } else {
        batch.set(publicProfileRef, {
          uid: user.uid,
          displayName: user.displayName,
          ...(user.photoURL ? { photoURL: user.photoURL } : {}),
        });
      }
      await batch.commit();
    } catch (userError) {
      console.error('Error actualizando suspensión:', userError);
      setError('No se pudo actualizar el estado del usuario.');
    }
  }

  async function deleteListing(listing: Listing) {
    const reason = deletionReason.trim();
    if (!reason) return;

    setDeletionBusy(true);
    setError('');
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'listings', listing.id));
      batch.delete(doc(db, 'listingPrivateDetails', listing.id));

      const historyRef = doc(firestoreCollection(db, 'listingHistory'));
      batch.set(historyRef, {
        listingId: listing.id,
        actorId: adminUid,
        actorRole: 'admin',
        action: 'deleted',
        changedFields: ['document'],
        summary: `Publicación eliminada por moderación. Motivo: ${reason}`,
        createdAt: Date.now(),
      });

      const notificationRef = doc(firestoreCollection(db, 'notifications'));
      batch.set(notificationRef, {
        recipientId: listing.ownerId,
        type: 'listing_removed',
        title: 'Publicación retirada',
        message: `Tu publicación “${listing.title}” fue retirada por moderación. Motivo: ${reason}`,
        listingId: listing.id,
        isRead: false,
        createdAt: Date.now(),
      });

      await batch.commit();
      await requestPushDelivery('notification_created', notificationRef.id);
      setDeleting(null);
      setDeletionReason('');
    } catch (deleteError) {
      console.error('Error eliminando publicación:', deleteError);
      setError('No se pudo eliminar la publicación. Revisa las reglas publicadas en Firebase y vuelve a intentarlo.');
    } finally {
      setDeletionBusy(false);
    }
  }

  async function migrateLegacyListingData() {
    setMigrationRunning(true);
    setMigrationSummary('');
    setError('');
    try {
      const privateMigration = await migratePrivateContacts();
      const snapshot = await getDocs(collection(db, 'listings'));
      const publicProfilesSnapshot = await getDocs(collection(db, 'publicProfiles'));
      const now = Date.now();
      let addressesMoved = 0;
      let expirationsNormalized = 0;
      let expiredArchived = 0;
      let publicProfilesReduced = 0;

      for (let offset = 0; offset < publicProfilesSnapshot.docs.length; offset += 200) {
        const batch = writeBatch(db);
        let hasWrites = false;
        for (const profileDoc of publicProfilesSnapshot.docs.slice(offset, offset + 200)) {
          const data = profileDoc.data();
          const photoURL = typeof data.photoURL === 'string'
            && data.photoURL.startsWith('https://lh3.googleusercontent.com/')
            ? data.photoURL.slice(0, 2048)
            : undefined;
          const allowedKeys = ['uid', 'displayName', ...(photoURL ? ['photoURL'] : [])].sort();
          const currentKeys = Object.keys(data).sort();
          const normalizedName = typeof data.displayName === 'string'
            ? data.displayName.normalize('NFC').replace(/[<>]/g, '').trim().slice(0, 60)
            : '';
          const displayName = normalizedName.length >= 2 ? normalizedName : 'Usuario';
          if (currentKeys.join('|') !== allowedKeys.join('|')
            || data.uid !== profileDoc.id
            || data.displayName !== displayName
            || data.photoURL !== photoURL) {
            batch.set(profileDoc.ref, {
              uid: profileDoc.id,
              displayName,
              ...(photoURL ? { photoURL } : {}),
            });
            publicProfilesReduced += 1;
            hasWrites = true;
          }
        }
        if (hasWrites) await batch.commit();
      }

      for (let offset = 0; offset < snapshot.docs.length; offset += 200) {
        const batch = writeBatch(db);
        const page = snapshot.docs.slice(offset, offset + 200);
        let hasWrites = false;

        for (const listingDoc of page) {
          const listing = listingDoc.data();
          const updates: Record<string, unknown> = {};
          const address = typeof listing.address === 'string' ? listing.address.trim() : '';

          if (address) {
            batch.set(
              doc(db, 'listingPrivateDetails', listingDoc.id),
              {
                ownerId: listing.ownerId,
                ...(address ? { address } : {}),
                updatedAt: now,
              },
              { merge: true }
            );
            if (address) addressesMoved += 1;
            hasWrites = true;
          }
          if ('address' in listing) updates.address = deleteField();

          const expiresAt = listing.expiresAt as { toMillis?: () => number } | number | undefined;
          let expiresAtMillis: number | null = null;
          if (typeof expiresAt === 'number' && Number.isFinite(expiresAt)) {
            expiresAtMillis = expiresAt;
          } else if (
            expiresAt !== null &&
            typeof expiresAt === 'object' &&
            typeof expiresAt.toMillis === 'function'
          ) {
            expiresAtMillis = expiresAt.toMillis();
            updates.expiresAt = expiresAtMillis;
            expirationsNormalized += 1;
          }

          if (listing.status === 'published' && expiresAtMillis !== null && expiresAtMillis <= now) {
            updates.status = 'archived';
            expiredArchived += 1;
          }

          if (Object.keys(updates).length > 0) {
            updates.updatedAt = now;
            batch.update(listingDoc.ref, updates);
            hasWrites = true;
          }
        }

        if (hasWrites) await batch.commit();
      }

      setMigrationSummary(
        `Listo: ${privateMigration.scanned} anuncios escaneados, ${privateMigration.phonesMoved} teléfonos trasladados a privado (${privateMigration.invalidPhones} requieren corregirse), ${privateMigration.addressesMoved + addressesMoved} direcciones protegidas, ${publicProfilesReduced} perfiles públicos reducidos a nombre y foto, ${expirationsNormalized} fechas normalizadas y ${expiredArchived} anuncios vencidos archivados.`
      );
    } catch (migrationError) {
      console.error('Error migrando los datos privados de anuncios:', migrationError);
      setError('No se pudieron migrar los datos. Verifica que las reglas de Firestore estén publicadas y vuelve a intentarlo.');
    } finally {
      setMigrationRunning(false);
    }
  }

  async function cleanExpiredRateLimits() {
    setCleanupRunning(true);
    setCleanupSummary('');
    setError('');
    try {
      const result = await postProtectedApi<{
        deleted: number;
        hasMore: boolean;
      }>('/api/cleanup-rate-limits', {});
      setCleanupSummary(
        `${result.deleted} registros vencidos eliminados.${result.hasMore ? ' Quedan más; vuelve a pulsar para continuar.' : ''}`,
      );
    } catch (cleanupError) {
      console.error('Error limpiando límites vencidos:', cleanupError);
      setError(cleanupError instanceof Error ? cleanupError.message : 'No se pudieron limpiar los límites vencidos.');
    } finally {
      setCleanupRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24">
      <div className="mx-auto max-w-7xl py-8">
        <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              ADMINISTRACIÓN · ESPACIO PRIVADO
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-ink-900 sm:text-4xl">{sectionHeading(activeSection).title}</h1>
            <p className="mt-2 text-sm text-ink-500 sm:text-base">{sectionHeading(activeSection).description}</p>
          </div>

          {activeSection !== 'overview' && activeSection !== 'tools' && activeSection !== 'ads' && <label className="relative block w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={activeSection === 'listings' ? 'Buscar anuncio, zona o propietario' : activeSection === 'reports' ? 'Buscar reporte o publicación' : 'Buscar nombre, correo o usuario'}
              className="motion-ease w-full rounded-xl border border-ink-700/10 bg-white py-3 pl-10 pr-4 text-sm text-ink-800 shadow-[0_4px_18px_rgba(30,36,28,0.04)] outline-none transition focus:border-brand-500/50 focus:ring-4 focus:ring-brand-500/10"
            />
          </label>}
        </header>

        <nav aria-label="Secciones del panel" className="mb-8 flex gap-1 overflow-x-auto rounded-2xl border border-ink-700/10 bg-white/75 p-1.5 shadow-[0_8px_26px_rgba(30,36,28,0.04)] backdrop-blur-sm">
          {ADMIN_SECTIONS.map((section) => {
            const Icon = section.icon;
            const badge = section.id === 'listings' ? counts.pending : section.id === 'reports' ? statistics.openReports : undefined;
            return <button key={section.id} type="button" onClick={() => { setActiveSection(section.id); setSearch(''); }} aria-current={activeSection === section.id ? 'page' : undefined} className={`motion-ease inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition duration-200 active:scale-[0.98] sm:px-4 ${activeSection === section.id ? 'bg-ink-900 text-white shadow-[0_4px_12px_rgba(27,32,24,0.16)]' : 'text-ink-500 hover:bg-ink-700/[0.04] hover:text-ink-800'}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />{section.label}
              {badge !== undefined && badge > 0 && <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold ${activeSection === section.id ? 'bg-white/15 text-white' : 'bg-amber-500/10 text-amber-800'}`}>{badge}</span>}
            </button>;
          })}
        </nav>

        {activeSection === 'ads' && <BusinessAdsAdmin />}

        {activeSection === 'tools' && <div className="space-y-4">
        <section className="flex flex-col gap-3 rounded-2xl border border-amber-300/50 bg-amber-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-amber-950">Preparar anuncios existentes</h2>
            <p className="mt-1 max-w-3xl text-sm text-amber-900/80">
              Antes de publicar las reglas nuevas de contacto, ejecuta esta migración para mover WhatsApp y direcciones antiguas a documentos privados. También normaliza fechas y archiva anuncios vencidos. No usa Cloud Functions ni activa cobros.
            </p>
            {migrationSummary && <p className="mt-2 text-sm font-semibold text-emerald-800">{migrationSummary}</p>}
          </div>
          <button
            type="button"
            onClick={() => void migrateLegacyListingData()}
            disabled={migrationRunning}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {migrationRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {migrationRunning ? 'Revisando…' : 'Migrar y archivar vencidos'}
          </button>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-ink-700/10 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-ink-800">Limpiar límites de abuso vencidos</h2>
            <p className="mt-1 max-w-3xl text-sm text-ink-500">
              Limpieza manual de contadores expirados. No configura TTL ni tareas programadas; solo se ejecuta cuando la solicitas y puede tomar varias pasadas.
            </p>
            {cleanupSummary && <p role="status" className="mt-2 text-sm font-semibold text-emerald-800">{cleanupSummary}</p>}
          </div>
          <button
            type="button"
            onClick={() => void cleanExpiredRateLimits()}
            disabled={cleanupRunning}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cream-300 px-4 py-3 text-sm font-semibold text-ink-700 hover:bg-cream-50 disabled:opacity-60"
          >
            {cleanupRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {cleanupRunning ? 'Limpiando…' : 'Limpiar registros vencidos'}
          </button>
        </section>
        </div>}

        {activeSection === 'overview' && <>
        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Clock3 />} label="En revisión" value={counts.pending} tone="amber" />
          <Metric icon={<Check />} label="Publicadas" value={counts.published} tone="green" />
          <Metric icon={<AlertCircle />} label="Reportes abiertos" value={statistics.openReports} tone="red" />
          <Metric icon={<UsersRound />} label="Cuentas" value={users.length} tone="blue" />
        </section>

        <AdminAnalytics listings={listings} />

        <section className="grid gap-4 md:grid-cols-2">
          <QuickAction icon={<Building2 className="h-5 w-5" />} eyebrow="Moderación" title="Revisar publicaciones" detail={`${counts.pending} anuncios esperan una decisión.`} onClick={() => { setActiveSection('listings'); setFilter('pending'); setSearch(''); }} />
          <QuickAction icon={<Flag className="h-5 w-5" />} eyebrow="Comunidad" title="Atender reportes" detail={`${statistics.openReports} reportes siguen abiertos.`} onClick={() => { setActiveSection('reports'); setSearch(''); }} />
        </section>
        </>}

        {activeSection === 'users' && <section className="rounded-2xl border border-ink-700/10 bg-white p-5 shadow-[0_12px_36px_rgba(30,36,28,0.045)]">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold text-ink">Usuarios</h2><p className="mt-1 text-xs text-ink-400">Control de cuentas suspendidas</p></div><UserCheck className="h-5 w-5 text-brand-500" /></div>
          <div className="divide-y divide-ink-700/[0.07]">{filteredUsers.map((user) => <div key={user.uid} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-700/[0.07] text-sm font-semibold text-brand-800">{(user.displayName || user.email || '?').slice(0, 1).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink-800">{user.displayName}</p><p className="truncate text-xs text-ink-400">{user.email}</p></div><span className={`ml-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${user.isBanned ? 'bg-red-500/10 text-red-700' : 'bg-emerald-500/10 text-emerald-800'}`}>{user.isBanned ? 'Suspendida' : 'Activa'}</span></div><button type="button" disabled={user.uid === adminUid} onClick={() => void toggleUserSuspension(user)} className={`motion-ease inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${user.isBanned ? 'border-emerald-700/15 text-emerald-800 hover:bg-emerald-50' : 'border-red-700/15 text-red-700 hover:bg-red-50'}`}>{user.isBanned ? <><UserCheck className="h-4 w-4" /> Reactivar</> : <><Ban className="h-4 w-4" /> Suspender</>}</button></div>)}</div>
          {filteredUsers.length === 0 && <EmptyAdminState message={search ? 'No encontramos cuentas que coincidan.' : 'Todavía no hay cuentas para mostrar.'} />}
        </section>}

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {activeSection === 'listings' && <>
        <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-ink-700/10 bg-white/75 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold text-ink-800">Estado de las publicaciones</h2><p className="mt-1 text-xs text-ink-400">{filteredListings.length} resultados · {counts.pending} pendientes de revisión</p></div>
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-ink-700/[0.035] p-1">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`motion-ease shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition duration-200 ${
                filter === item.value
                  ? 'bg-white text-ink-900 shadow-sm'
                  : 'text-ink-500 hover:bg-white/70 hover:text-ink-800'
              }`}
            >
              {item.label} <span className="ml-1 opacity-70">{counts[item.value]}</span>
            </button>
          ))}
          </div>
        </section>

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
                onDelete={() => {
                  setDeleting(listing);
                  setDeletionReason('');
                }}
              />
            ))}
          </div>
        )}
        </>}

        {activeSection === 'reports' && <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink-800">Reportes de la comunidad</h2>
              <p className="mt-1 text-sm text-ink-500">
                {statistics.openReports} abiertos · {filteredReports.length} resultados
              </p>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="rounded-2xl border border-cream-200 bg-white p-8 text-center text-sm text-ink-500 shadow-sm">
              {search ? 'No encontramos reportes que coincidan.' : 'Todavía no hay reportes.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => {
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
        </section>}
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

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-listing-title"
            className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-700">Acción permanente</p>
                <h2 id="delete-listing-title" className="mt-1 text-xl font-bold text-ink">Eliminar publicación</h2>
              </div>
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={deletionBusy}
                className="rounded-full p-2 text-ink-400 hover:bg-cream-100 disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              Se eliminará <strong>{deleting.title}</strong> y su dirección privada. La acción quedará registrada y avisaremos al propietario con el motivo. Los reportes existentes se conservarán para moderación.
            </p>

            <label className="mt-5 block text-sm font-semibold text-ink-700">
              Motivo de eliminación <span className="text-red-600">*</span>
              <textarea
                value={deletionReason}
                onChange={(event) => setDeletionReason(event.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Ej. ubicación incorrecta, anuncio duplicado o reporte confirmado…"
                className="mt-2 w-full resize-none rounded-xl border border-cream-300 bg-cream-50 p-3 font-normal text-ink outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
              />
              <span className="mt-1 block text-xs font-normal text-ink-400">El motivo se guardará en el historial administrativo y se enviará al propietario.</span>
            </label>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={deletionBusy}
                className="rounded-xl border border-cream-300 px-4 py-3 font-semibold text-ink-600 hover:bg-cream-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void deleteListing(deleting)}
                disabled={deletionBusy || deletionReason.trim().length < 5}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletionBusy ? 'Eliminando…' : 'Eliminar definitivamente'}
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
    <div className="flex items-center gap-4 rounded-2xl border border-ink-700/10 bg-white p-4 shadow-[0_8px_28px_rgba(30,36,28,0.035)] sm:p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div>
      <div><p className="text-xs font-medium text-ink-500">{label}</p><p className="mt-0.5 text-2xl font-semibold tracking-tight text-ink-900">{value}</p></div>
    </div>
  );
}

function QuickAction({ icon, eyebrow, title, detail, onClick }: { icon: React.ReactNode; eyebrow: string; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="motion-ease group flex min-h-28 items-center gap-4 rounded-2xl border border-ink-700/10 bg-white p-5 text-left shadow-[0_8px_28px_rgba(30,36,28,0.035)] transition duration-300 hover:-translate-y-0.5 hover:border-brand-700/20 hover:shadow-[0_14px_38px_rgba(30,36,28,0.08)] active:translate-y-0">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700/[0.07] text-brand-800">{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">{eyebrow}</span><span className="mt-1 block text-sm font-semibold text-ink-900">{title}</span><span className="mt-1 block text-xs text-ink-500">{detail}</span></span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-700" aria-hidden="true" />
    </button>
  );
}

function EmptyAdminState({ message }: { message: string }) {
  return <p className="rounded-xl border border-dashed border-ink-700/15 px-4 py-10 text-center text-sm text-ink-500">{message}</p>;
}

function AdminListingRow({ listing, busy, onApprove, onReject, onReview, onDelete }: { listing: Listing; busy: boolean; onApprove: () => void; onReject: () => void; onReview: () => void; onDelete: () => void }) {
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
        <button type="button" onClick={onDelete} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-4 w-4" /> Eliminar</button>
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
