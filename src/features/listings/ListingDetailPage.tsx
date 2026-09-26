import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, doc, getDoc, increment, setDoc, writeBatch } from 'firebase/firestore';
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Bed,
  Bath,
  Car,
  Maximize,
  Check,
  Share2,
  Flag,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { auth } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { internalMessageSchema, reportSchema, type InternalMessageInput, type ReportInput } from '../../lib/zod-schemas';
import {
  formatPrice,
  whatsappLink,
  timeAgo,
  availabilityColor,
} from '../../lib/utils';
import {
  categoryEmoji,
  categoryLabel,
  operationLabel,
  priceUnitLabel,
  availabilityMeta,
} from '../../lib/constants';
import { HouseLoader } from '../../components/ui/HouseLoader';
import { FavoriteButton } from '../favorites/FavoriteButton';
import { LocationView } from './LocationView';
import type { Listing, AppUser } from '../../types/models';
import { trackListingMetric } from '../../lib/listing-metrics';
import { isListingExpired } from '../../lib/listing-expiration';

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { fbUser, profile } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [owner, setOwner] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState('');
  const [reporting, setReporting] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');

    getDoc(doc(db, 'listings', id))
      .then(async (snap) => {
        if (!snap.exists()) {
          setError('La publicación no existe o fue eliminada.');
          return;
        }
        const data = { id: snap.id, ...(snap.data() as Omit<Listing, 'id'>) };

        if (data.status === 'published' && isListingExpired(data.expiresAt)) {
          setError('Esta publicación ya expiró y no está disponible públicamente.');
          return;
        }

        if (data.status !== 'published' && data.ownerId !== auth.currentUser?.uid && profile?.role !== 'admin') {
          setError('Esta publicación ya no está disponible públicamente.');
          return;
        }

        setListing(data);
        trackListingMetric(data.id, 'viewsCount');

        // 🆕 Traer el perfil del dueño para mostrar su nombre real
        try {
          const ownerSnap = await getDoc(doc(db, 'users', data.ownerId));
          if (ownerSnap.exists()) {
            setOwner(ownerSnap.data() as AppUser);
          }
        } catch (err) {
          console.error('Error cargando perfil del propietario:', err);
          // No es crítico: si falla, seguimos mostrando "Propietario" genérico
        }
      })
      .catch((err) => {
        console.error('Error cargando publicación:', err);
        setError('No pudimos cargar esta publicación.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function copyLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing?.title ?? 'Propiedad en IxmiPlace',
          text: 'Mira esta propiedad en IxmiPlace',
          url: window.location.href,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silencioso */
    }
  }

  async function submitReport(data: ReportInput) {
    if (!fbUser || !auth.currentUser || !listing) {
      setReportError('Debes iniciar sesión para reportar una publicación.');
      return;
    }

    const parsed = reportSchema.safeParse(data);
    if (!parsed.success) {
      setReportError('Selecciona un motivo válido para el reporte.');
      return;
    }

    setReporting(true);
    setReportError('');

    try {
      const reportId = `${fbUser.uid}_${listing.id}`;
      const batch = writeBatch(db);
      batch.set(doc(db, 'reports', reportId), {
        listingId: listing.id,
        reporterId: fbUser.uid,
        reason: parsed.data.reason,
        ...(parsed.data.comment ? { comment: parsed.data.comment } : {}),
        status: 'open',
        createdAt: Date.now(),
      });
      batch.update(doc(db, 'listings', listing.id), {
        reportsCount: increment(1),
      });
      await batch.commit();
      setReportSent(true);
    } catch (err) {
      console.error('Error enviando reporte:', err);
      setReportError('No se pudo enviar. Quizá ya reportaste esta publicación.');
    } finally {
      setReporting(false);
    }
  }

  async function submitContact(data: InternalMessageInput) {
    if (!fbUser || !listing || !profile) {
      setContactError('Inicia sesión y verifica tu correo para enviar mensajes.');
      return;
    }

    const parsed = internalMessageSchema.safeParse(data);
    if (!parsed.success) {
      setContactError(parsed.error.issues[0]?.message ?? 'Revisa el formulario.');
      return;
    }

    setContacting(true);
    setContactError('');
    try {
      await setDoc(doc(collection(db, 'messages')), {
        listingId: listing.id,
        senderId: fbUser.uid,
        recipientId: listing.ownerId,
        senderName: profile.displayName,
        subject: parsed.data.subject,
        message: parsed.data.message,
        status: 'unread',
        createdAt: Date.now(),
      });
      setContactSent(true);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setContactError('No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      setContacting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <HouseLoader variant="line" size="md" message="Cargando propiedad…" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="w-full max-w-md rounded-2xl border border-cream-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-ink">
            {error || 'Publicación no encontrada'}
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Puede que el enlace esté roto o que el anuncio haya sido retirado.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500
                       px-5 py-3 font-semibold text-white shadow-lg shadow-brand-500/30
                       transition hover:bg-brand-600"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const meta = availabilityMeta(listing.availability);
  const wa = whatsappLink(
    listing.whatsapp,
    `Hola, vi tu anuncio "${listing.title}" en IxmiPlace. ¿Sigue disponible?`
  );

  const hasDetails =
    listing.bedrooms ||
    listing.bathrooms ||
    listing.parkingSpots ||
    listing.areaM2;

  // 🆕 Solo mostramos el mapa si el listing tiene coordenadas
  // (publicaciones antiguas, creadas antes del mapa, no las tienen)
  const hasLocation = listing.lat !== undefined && listing.lng !== undefined;

  // 🆕 Nombre e inicial del propietario, con fallback si no cargó el perfil
  const ownerName = owner?.displayName || 'Propietario';
  const ownerInitials = ownerName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-cream pt-20 pb-24 lg:pb-12">
      <div className="mx-auto max-w-6xl px-4 py-6">

        {/* ═══════════ Header ═══════════ */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            aria-label="Volver"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full
                       bg-white text-ink-600 shadow-sm ring-1 ring-cream-200
                       transition hover:bg-cream-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              {categoryEmoji(listing.category)} {categoryLabel(listing.category)} ·{' '}
              {operationLabel(listing.operation)}
            </p>
            <h1 className="truncate text-lg font-bold text-ink sm:text-xl">
              {listing.title}
            </h1>
          </div>

          {/* ⭐ Botón de favoritos */}
          <FavoriteButton listingId={listing.id} variant="inline" tone="light" />

          {/* Botón compartir */}
          <button
            onClick={copyLink}
            aria-label="Compartir"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full
                       bg-white text-ink-600 shadow-sm ring-1 ring-cream-200
                       transition hover:bg-cream-100"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* ═══════════ Layout: 2 columnas en desktop ═══════════ */}
        <div className="grid gap-8 lg:grid-cols-3">

          {/* ───────── COLUMNA IZQUIERDA (2/3) ───────── */}
          <div className="space-y-8 lg:col-span-2">

            {/* GALERÍA */}
            <Gallery
              photos={listing.photos}
              title={listing.title}
              current={currentPhoto}
              onChange={setCurrentPhoto}
            />

            {/* DETALLES PRINCIPALES */}
            <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1
                                text-xs font-semibold ${meta.bg}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${availabilityColor(
                        listing.availability
                      )}`}
                    />
                    {meta.label}
                  </span>
                  <p className="mt-2 text-xs text-ink-400">
                    Publicado {timeAgo(listing.createdAt)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-extrabold text-brand-600">
                    {formatPrice(listing.price)}
                  </p>
                  <p className="text-sm text-ink-400">
                    {priceUnitLabel(listing.priceUnit)}
                  </p>
                </div>
              </div>

              {/* Ubicación */}
              <div className="mt-6 flex items-center gap-2 text-ink-600">
                <MapPin className="h-4 w-4 text-secondary-500" />
                <span className="text-sm">
                  {listing.colonia}, Ixmiquilpan
                </span>
              </div>
            </section>

            {/* DESCRIPCIÓN */}
            <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-ink">
                Descripción
              </h2>
              <p className="whitespace-pre-line leading-relaxed text-ink-600">
                {listing.description}
              </p>
            </section>

            {/* DETALLES */}
            {(listing.category === 'hotel' || listing.category === 'motel') && (
              <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-ink">Informacion de hospedaje</h2>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  {listing.establishmentName && <div><dt className="text-ink-400">Establecimiento</dt><dd className="font-medium text-ink-700">{listing.establishmentName}</dd></div>}
                  {listing.roomType && <div><dt className="text-ink-400">Habitacion</dt><dd className="font-medium text-ink-700">{listing.roomType}</dd></div>}
                  {listing.checkInTime && <div><dt className="text-ink-400">Entrada</dt><dd className="font-medium text-ink-700">{listing.checkInTime}</dd></div>}
                  {listing.checkOutTime && <div><dt className="text-ink-400">Salida</dt><dd className="font-medium text-ink-700">{listing.checkOutTime}</dd></div>}
                  {listing.reception24h && <div><dd className="font-medium text-ink-700">Recepcion las 24 horas</dd></div>}
                  {listing.category === 'motel' && listing.stayDurationHours && listing.priceUnit === 'estancia' && <div><dt className="text-ink-400">Duracion de estancia</dt><dd className="font-medium text-ink-700">{listing.stayDurationHours} horas</dd></div>}
                  {listing.category === 'motel' && listing.foodAvailable && <div className="sm:col-span-2"><dt className="text-ink-400">Comida y bebidas</dt><dd className="font-medium text-ink-700">{listing.foodDescription}</dd></div>}
                </dl>
              </section>
            )}

            {hasDetails && (
              <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-ink">
                  Detalles de la propiedad
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {listing.bedrooms !== undefined && listing.bedrooms > 0 && (
                    <DetailItem
                      icon={<Bed className="h-5 w-5" />}
                      label="Recámaras"
                      value={listing.bedrooms}
                    />
                  )}
                  {listing.bathrooms !== undefined && listing.bathrooms > 0 && (
                    <DetailItem
                      icon={<Bath className="h-5 w-5" />}
                      label="Baños"
                      value={listing.bathrooms}
                    />
                  )}
                  {listing.parkingSpots !== undefined &&
                    listing.parkingSpots > 0 && (
                      <DetailItem
                        icon={<Car className="h-5 w-5" />}
                        label="Estacionamiento"
                        value={listing.parkingSpots}
                      />
                    )}
                  {listing.areaM2 !== undefined && listing.areaM2 > 0 && (
                    <DetailItem
                      icon={<Maximize className="h-5 w-5" />}
                      label="Metros"
                      value={`${listing.areaM2} m²`}
                    />
                  )}
                </div>
              </section>
            )}

            {/* AMENIDADES */}
            {listing.amenities && listing.amenities.length > 0 && (
              <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-ink">
                  Amenidades
                </h2>
                <div className="flex flex-wrap gap-2">
                  {listing.amenities.map((a) => (
                    <span
                      key={a}
                      className="flex items-center gap-1.5 rounded-full
                                 bg-brand-50 px-3 py-1.5 text-sm font-medium
                                 text-brand-700 ring-1 ring-brand-500/20"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {a}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* 🆕 UBICACIÓN EN MAPA */}
            {hasLocation && (
              <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-ink">
                  Ubicación aproximada
                </h2>
                <LocationView position={{ lat: listing.lat!, lng: listing.lng! }} />
                <p className="mt-3 text-xs text-ink-400">
                  La ubicación exacta se comparte al contactar al propietario.
                </p>
              </section>
            )}

            {/* BOTÓN REPORTAR */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setReportError('');
                  setReportSent(false);
                  setReportOpen(true);
                }}
                className="flex items-center gap-2 rounded-full border border-cream-300
                           bg-white px-5 py-2.5 text-sm font-medium text-ink-500
                           transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Flag className="h-4 w-4" />
                Reportar esta publicación
              </button>
            </div>
          </div>

          {/* ───────── COLUMNA DERECHA (1/3) — STICKY ───────── */}
          <aside className="lg:col-span-1">
            <div className="space-y-4 lg:sticky lg:top-24">

              {/* CTA WHATSAPP */}
              <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackListingMetric(listing.id, 'whatsappContactsCount')}
                  className="group flex w-full items-center justify-center gap-2
                             rounded-xl bg-gradient-to-r from-green-500 to-green-600
                             py-3.5 font-semibold text-white
                             shadow-lg shadow-green-500/30 transition
                             hover:shadow-xl hover:shadow-green-500/40 hover:brightness-110"
                >
                  <MessageCircle className="h-5 w-5" />
                  Contactar por WhatsApp
                </a>
                <p className="mt-3 text-center text-xs text-ink-400">
                  Respuesta directa con el propietario
                </p>
                {fbUser?.uid !== listing.ownerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setContactError('');
                      setContactSent(false);
                      setContactOpen(true);
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
                  >
                    <Mail className="h-4 w-4" />
                    Enviar mensaje interno
                  </button>
                )}
              </div>

              {/* INFO DEL PROPIETARIO */}
              <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  {owner?.photoURL ? (
                    <img
                      src={owner.photoURL}
                      alt={ownerName}
                      referrerPolicy="no-referrer"
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-cream-200"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full
                                 bg-brand-100 text-lg font-bold text-brand-700"
                    >
                      {ownerInitials}
                    </div>
                  )}
                  <div>

                    <Link to={`/propietario/${listing.ownerId}`} className="text-sm font-semibold text-ink hover:text-brand-600">
                      {ownerName}
                    </Link>

                    {listing.ownerEmailVerified === true && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Check className="h-3 w-3" />
                        Correo verificado
                      </span>
                    )}

                    <p className="text-xs text-ink-400">
                      Publicado {timeAgo(listing.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-brand-50 p-3 text-xs text-brand-700">
                  💡 <strong>Consejo de seguridad:</strong> nunca hagas pagos
                  por adelantado. Visita la propiedad en persona antes de
                  firmar cualquier contrato.
                </div>
              </div>

              {/* INFO EXTRA */}
              <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Categoría</span>
                    <span className="font-medium text-ink">
                      {categoryEmoji(listing.category)}{' '}
                      {categoryLabel(listing.category)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Operación</span>
                    <span className="font-medium text-ink">
                      {operationLabel(listing.operation)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Zona</span>
                    <span className="font-medium text-ink">
                      {listing.colonia}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* BOTÓN FLOTANTE WHATSAPP (móvil) */}
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackListingMetric(listing.id, 'whatsappContactsCount')}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center
                   rounded-full bg-gradient-to-br from-green-500 to-green-600
                   text-white shadow-2xl shadow-green-500/40
                   transition hover:scale-110 lg:hidden"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>

      {/* Toast copiado */}
      {copied && (
        <div
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full
                     bg-ink/90 px-5 py-2.5 text-sm font-medium text-white
                     backdrop-blur-sm"
        >
          Enlace copiado ✓
        </div>
      )}

      {reportOpen && (
        <ReportDialog
          sent={reportSent}
          error={reportError}
          submitting={reporting}
          isSignedIn={Boolean(fbUser)}
          onClose={() => setReportOpen(false)}
          onSubmit={submitReport}
        />
      )}

      {contactOpen && (
        <ContactDialog
          sent={contactSent}
          error={contactError}
          submitting={contacting}
          isSignedIn={Boolean(fbUser)}
          ownerName={ownerName}
          onClose={() => setContactOpen(false)}
          onSubmit={submitContact}
        />
      )}
    </div>
  );
}

function ContactDialog({
  sent,
  error,
  submitting,
  isSignedIn,
  ownerName,
  onClose,
  onSubmit,
}: {
  sent: boolean;
  error: string;
  submitting: boolean;
  isSignedIn: boolean;
  ownerName: string;
  onClose: () => void;
  onSubmit: (data: InternalMessageInput) => Promise<void>;
}) {
  const [subject, setSubject] = useState('Me interesa tu propiedad');
  const [message, setMessage] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-cream-200 bg-white p-6 shadow-2xl">
        {sent ? (
          <div className="text-center">
            <Mail className="mx-auto h-10 w-10 text-brand-500" />
            <h2 className="mt-4 text-xl font-bold text-ink">Mensaje enviado</h2>
            <p className="mt-2 text-sm text-ink-500">El propietario podrá responderte dentro de IxmiPlace.</p>
            <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-600">Contacto interno</p>
                <h2 className="mt-1 text-xl font-bold text-ink">Escribe a {ownerName}</h2>
              </div>
              <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-600" aria-label="Cerrar">×</button>
            </div>
            {!isSignedIn ? (
              <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Inicia sesión y verifica tu correo para enviar un mensaje.</p>
            ) : (
              <>
                <label className="mt-5 block text-sm font-semibold text-ink-700">
                  Asunto
                  <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={100} className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 font-normal text-ink outline-none focus:border-brand-500" />
                </label>
                <label className="mt-4 block text-sm font-semibold text-ink-700">
                  Mensaje
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={5} placeholder="Hola, me interesa saber más sobre esta propiedad…" className="mt-2 w-full resize-none rounded-xl border border-cream-300 bg-cream-50 p-3 font-normal text-ink outline-none focus:border-brand-500" />
                </label>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-cream-300 px-4 py-3 font-semibold text-ink-600 hover:bg-cream-100">Cancelar</button>
                  <button type="button" disabled={submitting} onClick={() => void onSubmit({ subject, message })} className="flex-1 rounded-xl bg-brand-500 px-4 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-60">{submitting ? 'Enviando…' : 'Enviar mensaje'}</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReportDialog({
  sent,
  error,
  submitting,
  isSignedIn,
  onClose,
  onSubmit,
}: {
  sent: boolean;
  error: string;
  submitting: boolean;
  isSignedIn: boolean;
  onClose: () => void;
  onSubmit: (data: ReportInput) => Promise<void>;
}) {
  const [reason, setReason] = useState<ReportInput['reason']>('spam');
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-cream-200 bg-white p-6 shadow-2xl">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-ink">Reporte enviado</h2>
            <p className="mt-2 text-sm text-ink-500">Gracias. Revisaremos esta publicación.</p>
            <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600">Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-red-600">Reportar publicación</p>
                <h2 className="mt-1 text-xl font-bold text-ink">¿Qué sucede?</h2>
              </div>
              <button type="button" onClick={onClose} className="text-ink-400 hover:text-ink-600" aria-label="Cerrar">×</button>
            </div>
            {!isSignedIn ? (
              <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Inicia sesión y verifica tu correo para enviar un reporte.</p>
            ) : (
              <>
                <label className="mt-5 block text-sm font-semibold text-ink-700">
                  Motivo
                  <select value={reason} onChange={(event) => setReason(event.target.value as ReportInput['reason'])} className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 font-normal text-ink outline-none focus:border-brand-500">
                    <option value="spam">Spam o publicidad</option>
                    <option value="fraude">Posible fraude</option>
                    <option value="no_existe">La propiedad no existe</option>
                    <option value="duplicado">Publicación duplicada</option>
                    <option value="otro">Otro motivo</option>
                  </select>
                </label>
                <label className="mt-4 block text-sm font-semibold text-ink-700">
                  Comentario <span className="font-normal text-ink-400">(opcional)</span>
                  <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} rows={4} className="mt-2 w-full resize-none rounded-xl border border-cream-300 bg-cream-50 p-3 font-normal text-ink outline-none focus:border-brand-500" placeholder="Cuéntanos brevemente qué detectaste…" />
                </label>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-cream-300 px-4 py-3 font-semibold text-ink-600 hover:bg-cream-100">Cancelar</button>
                  <button type="button" disabled={submitting} onClick={() => void onSubmit({ reason, comment })} className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60">{submitting ? 'Enviando…' : 'Enviar reporte'}</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Galería
// ─────────────────────────────────────────────────
function Gallery({
  photos,
  title,
  current,
  onChange,
}: {
  photos: string[];
  title: string;
  current: number;
  onChange: (index: number) => void;
}) {
  if (photos.length === 0) {
    return (
      <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-cream-200" />
    );
  }

  return (
    <div className="space-y-3">
      {/* Imagen principal */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-cream-200 shadow-sm">
        <img
          src={photos[current]}
          alt={title}
          className="h-full w-full object-cover"
        />
        {photos.length > 1 && (
          <span
            className="absolute bottom-3 right-3 rounded-full bg-ink/70
                       px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
          >
            {current + 1} / {photos.length}
          </span>
        )}
      </div>

      {/* Miniaturas */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => onChange(i)}
              className={`
                relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl
                transition-all duration-200
                ${
                  i === current
                    ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-cream'
                    : 'opacity-70 hover:opacity-100'
                }
              `}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Ítem de detalle
// ─────────────────────────────────────────────────
function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-cream-50 p-3 text-center">
      <span className="text-secondary-500">{icon}</span>
      <span className="mt-1 text-lg font-bold text-ink">{value}</span>
      <span className="text-xs text-ink-400">{label}</span>
    </div>
  );
}
