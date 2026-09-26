import { useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, writeBatch } from 'firebase/firestore';
import {
  Eye,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  AlertTriangle,
  Heart,
  RotateCcw,
  MessageCircle,
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { db } from '../../lib/firebase';
import {
  categoryEmoji,
  operationLabel,
  priceUnitLabel,
  availabilityMeta,
} from '../../lib/constants';
import type { Listing } from '../../types/models';
import { LISTING_LIMITS } from '../../lib/constants';
import { isListingExpired } from '../../lib/listing-expiration';

interface Props {
  listing: Listing;
}

// Metadatos del estado (colors + label)
function statusMeta(status: Listing['status']): {
  label: string;
  bg: string;
  dot: string;
} {
  switch (status) {
    case 'pending':
      return {
        label: 'En revisión',
        bg: 'bg-accent-100 text-accent-800',
        dot: 'bg-accent-500',
      };
    case 'published':
      return {
        label: 'Publicada',
        bg: 'bg-green-100 text-green-800',
        dot: 'bg-green-500',
      };
    case 'rejected':
      return {
        label: 'Rechazada',
        bg: 'bg-red-100 text-red-800',
        dot: 'bg-red-500',
      };
    case 'archived':
      return {
        label: 'Archivada',
        bg: 'bg-cream-200 text-ink-600',
        dot: 'bg-ink-400',
      };
    default:
      return {
        label: status,
        bg: 'bg-cream-200 text-ink-600',
        dot: 'bg-ink-400',
      };
  }
}

export function ListingCardMine({ listing }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [renewing, setRenewing] = useState(false);

  const status = statusMeta(listing.status);
  const availability = availabilityMeta(listing.availability);

  // 🆕 Publicaciones antiguas no tienen este campo, por eso el `?? 0`
  const favoritesCount = listing.favoritesCount ?? 0;

  async function handleDelete() {
    setDeleting(true);
    try {
      const privateDetailsRef = doc(db, 'listingPrivateDetails', listing.id);
      const privateDetails = await getDoc(privateDetailsRef);
      const batch = writeBatch(db);
      batch.delete(doc(db, 'listings', listing.id));
      if (privateDetails.exists()) batch.delete(privateDetailsRef);
      await batch.commit();
    } catch (err) {
      console.error('Error eliminando publicación:', err);
      alert('No se pudo eliminar. Intenta de nuevo.');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  const isExpired = isListingExpired(listing.expiresAt);

  async function handleRenew() {
    setRenewing(true);
    try {
      const now = Date.now();
      const batch = writeBatch(db);
      const changedFields = listing.status === 'archived'
        ? ['status', 'expiresAt']
        : ['expiresAt'];
      batch.update(doc(db, 'listings', listing.id), {
        ...(listing.status === 'archived' ? { status: 'published' } : {}),
        expiresAt: now + LISTING_LIMITS.activeDays * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });
      batch.set(doc(collection(db, 'listingHistory')), {
        listingId: listing.id,
        actorId: listing.ownerId,
        actorRole: 'owner',
        action: 'renewed',
        changedFields,
        summary: 'El propietario renovó la publicación por 30 días.',
        createdAt: now,
      });
      await batch.commit();
    } catch (err) {
      console.error('Error renovando publicación:', err);
      alert('No se pudo renovar. Intenta de nuevo.');
    } finally {
      setRenewing(false);
    }
  }

  const coverPhoto = listing.photos[0];

  return (
    <>
      <article
        className="group relative overflow-hidden rounded-2xl border border-cream-200
                   bg-white shadow-sm transition-all duration-300
                   hover:-translate-y-0.5 hover:border-secondary-300 hover:shadow-lg"
      >
        {/* Imagen */}
        <div className="relative aspect-[4/3] overflow-hidden bg-cream-200">
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt={listing.title}
              className="h-full w-full object-cover transition duration-500
                         group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-400">
              Sin imagen
            </div>
          )}

          {/* Badge de estado */}
          <span
            className={`absolute left-3 top-3 flex items-center gap-1.5
                        rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm
                        ${status.bg}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>

          {/* Badge disponibilidad (si está publicada) */}
          {listing.status === 'published' && (
            <span
              className={`absolute right-3 top-3 flex items-center gap-1.5
                          rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm
                          ${availability.bg}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${availability.dot}`} />
              {availability.label}
            </span>
          )}

          {/* 🆕 Badge de favoritos, solo si tiene al menos 1 */}
          {favoritesCount > 0 && (
            <span
              className="absolute bottom-3 right-3 flex items-center gap-1
                         rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold
                         text-red-500 shadow-sm backdrop-blur-sm"
            >
              <Heart className="h-3.5 w-3.5 fill-red-500" />
              {favoritesCount}
            </span>
          )}
        </div>

        {/* Contenido */}
        <div className="space-y-3 p-4">
          <div>
            <h3 className="line-clamp-1 font-semibold text-ink">
              {listing.title}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-ink-400">
              <MapPin className="h-3 w-3" />
              {listing.colonia}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-cream-200 pt-3">
            <div>
              <p className="text-lg font-bold text-brand-600">
                {formatPrice(listing.price)}
                <span className="ml-1 text-xs font-normal text-ink-400">
                  {priceUnitLabel(listing.priceUnit)}
                </span>
              </p>
              <p className="text-xs text-ink-400">
                {categoryEmoji(listing.category)}{' '}
                {operationLabel(listing.operation)}
              </p>
            </div>

            {/* 🆕 Contador de favoritos, visible siempre (incluso en 0) */}
            <div
              className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5
                         text-sm font-semibold text-red-500"
              title={
                favoritesCount === 1
                  ? '1 persona guardó esta publicación'
                  : `${favoritesCount} personas guardaron esta publicación`
              }
            >
              <Heart
                className={`h-4 w-4 ${favoritesCount > 0 ? 'fill-red-500' : ''}`}
              />
              {favoritesCount}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-ink-400">
            <span className="inline-flex items-center gap-1" title="Visitas únicas por navegador">
              <Eye className="h-3.5 w-3.5" />
              {listing.viewsCount ?? 0} visitas
            </span>
            <span className="inline-flex items-center gap-1" title="Clics para contactar por WhatsApp">
              <MessageCircle className="h-3.5 w-3.5" />
              {listing.whatsappContactsCount ?? 0} contactos
            </span>
          </div>

          {/* Motivo de rechazo si aplica */}
          {listing.status === 'rejected' && listing.rejectionReason && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{listing.rejectionReason}</span>
            </div>
          )}

          {(listing.status === 'published' || listing.status === 'archived') && isExpired && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p>Esta publicación expiró y ya no aparece en el feed público.</p>
              <button
                type="button"
                onClick={() => void handleRenew()}
                disabled={renewing}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${renewing ? 'animate-spin' : ''}`} />
                {renewing ? 'Renovando…' : 'Renovar por 30 días'}
              </button>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-1">
            <Link
              to={`/listing/${listing.id}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg
                         bg-cream-100 py-2 text-sm font-medium text-ink-600
                         transition hover:bg-cream-200 hover:text-ink-700"
              aria-label="Ver publicación"
            >
              <Eye className="h-4 w-4" />
              Ver
            </Link>

            <Link
              to={`/editar/${listing.id}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg
                         bg-secondary-50 py-2 text-sm font-medium text-secondary-700
                         transition hover:bg-secondary-100"
              aria-label="Editar publicación"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>

            <Link
              to={`/historial/${listing.id}`}
              className="flex items-center justify-center rounded-lg bg-brand-50 px-3 py-2 text-brand-700 transition hover:bg-brand-100"
              aria-label="Ver historial de cambios"
              title="Historial de cambios"
            >
              <RotateCcw className="h-4 w-4" />
            </Link>

            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              aria-label="Eliminar publicación"
              className="flex items-center justify-center rounded-lg bg-red-50
                         px-3 py-2 text-red-600 transition hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </article>

      {/* Modal de confirmación */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center
                     bg-ink/60 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-ink">¿Eliminar publicación?</h3>
            <p className="mt-2 text-sm text-ink-500">
              Esta acción no se puede deshacer. La publicación y su información
              se borrarán permanentemente.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl bg-cream-100 py-2.5 text-sm font-medium
                           text-ink-600 transition hover:bg-cream-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl
                           bg-red-600 py-2.5 text-sm font-semibold text-white
                           transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eliminando…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
