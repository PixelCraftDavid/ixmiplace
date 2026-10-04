import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  MapPin,
  Bed,
  Bath,
  Car,
  Maximize,
  Check,
  Share2,
  Flag,
  AlertCircle,
  Mail,
  ShieldCheck,
  Droplets,
  Bus,
  Landmark,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { auth } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { internalMessageSchema, reportSchema, type InternalMessageInput, type ReportInput } from '../../lib/zod-schemas';
import {
  formatPrice,
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
import type { Listing, PublicProfile } from '../../types/models';
import { trackListingMetric } from '../../lib/listing-metrics';
import { isListingExpired } from '../../lib/listing-expiration';
import { PrivacyNoticeInline } from '../../components/legal/PrivacyNoticeInline';
import { requestPushDelivery } from '../../lib/push-notifications';
import { WhatsAppContactButton } from './WhatsAppContactButton';
import { postAuthenticatedApi, postProtectedApi } from '../../lib/protected-api';
import { isSafeDocumentId } from '../../lib/document-id';
import { optimizedUrl } from '../../lib/cloudinary';
import { usePageMeta, SITE_ORIGIN } from '../../components/seo/PageMeta';
import { HoneypotField } from '../../components/ui/HoneypotField';

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { fbUser, profile } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [owner, setOwner] = useState<PublicProfile | null>(null);
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

  const pageTitle = listing
    ? `${listing.title} | ${listing.colonia}, Ixmiquilpan | IxmiPlace`
    : 'Publicación de vivienda en Ixmiquilpan | IxmiPlace';
  const pageDescription = listing
    ? `${listing.operation === 'venta' ? 'En venta' : listing.operation === 'hospedaje' ? 'Hospedaje' : 'En renta'}: ${listing.title}. ${listing.colonia}, Ixmiquilpan, Hidalgo. Precio: ${formatPrice(listing.price)} ${priceUnitLabel(listing.priceUnit)}.`.slice(0, 300)
    : 'Consulta los detalles de esta opción de renta, venta o hospedaje en Ixmiquilpan, Hidalgo.';
  const listingStructuredData = useMemo(() => listing?.status === 'published' ? {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: listing.title,
    description: pageDescription,
    ...(listing.photos[0] ? { image: optimizedUrl(listing.photos[0], 1200, 900) } : {}),
    category: listing.category,
    datePosted: Number.isFinite(listing.createdAt) ? new Date(listing.createdAt).toISOString() : undefined,
    offers: {
      '@type': listing.operation === 'venta' ? 'OfferForPurchase' : 'OfferForLease',
      url: `${SITE_ORIGIN}/listing/${listing.id}`,
      price: listing.price,
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
      itemOffered: {
        '@type': 'Place',
        name: listing.title,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Ixmiquilpan',
          addressRegion: 'Hidalgo',
          addressCountry: 'MX',
        },
      },
    },
  } : null, [listing, pageDescription]);
  usePageMeta(pageTitle, pageDescription, {
    image: listing?.photos[0] ? optimizedUrl(listing.photos[0], 1200, 900) : '/icon-512.png',
    noIndex: !listing || listing.status !== 'published' || Boolean(error),
    structuredData: listingStructuredData,
  });

  useEffect(() => {
    if (!isSafeDocumentId(id)) {
      setError('La publicación no existe o fue eliminada.');
      setLoading(false);
      return;
    }
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
          const ownerSnap = await getDoc(doc(db, 'publicProfiles', data.ownerId));
          if (ownerSnap.exists()) {
            setOwner(ownerSnap.data() as PublicProfile);
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

  async function submitReport(data: ReportInput & { website?: string }) {
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
      const result = await postProtectedApi<{ reportId: string }>('/api/report', {
        listingId: listing.id,
        reason: parsed.data.reason,
        ...(data.website ? { website: data.website } : {}),
        ...(parsed.data.comment ? { comment: parsed.data.comment } : {}),
      });
      await requestPushDelivery('report_created', result.reportId);
      setReportSent(true);
    } catch (err) {
      console.error('Error enviando reporte:', err);
      setReportError('No se pudo enviar. Quizá ya reportaste esta publicación.');
    } finally {
      setReporting(false);
    }
  }

  async function submitContact(data: InternalMessageInput & { website?: string }) {
    if (!fbUser || !listing || !profile) {
      setContactError('Inicia sesión y verifica tu correo para enviar mensajes.');
      return;
    }

    // `website` is the honeypot field, not part of the user-facing message
    // schema (which is strict). Keep it out of client validation and send it
    // separately so the API can reject bots that filled it in.
    const parsed = internalMessageSchema.safeParse({
      subject: data.subject,
      message: data.message,
      ...(data.visitRequestedAt ? { visitRequestedAt: data.visitRequestedAt } : {}),
      ...(data.openHouseRsvp ? { openHouseRsvp: true } : {}),
    });
    if (!parsed.success) {
      setContactError(parsed.error.issues[0]?.message ?? 'Revisa el formulario.');
      return;
    }

    setContacting(true);
    setContactError('');
    try {
      const result = await postAuthenticatedApi<{ messageId: string }>('/api/message', {
        listingId: listing.id,
        subject: parsed.data.subject,
        message: parsed.data.message,
        ...(data.website ? { website: data.website } : {}),
        ...(parsed.data.visitRequestedAt ? { visitRequestedAt: parsed.data.visitRequestedAt } : {}),
        ...(parsed.data.openHouseRsvp ? { openHouseRsvp: true } : {}),
      });
      await requestPushDelivery('message_created', result.messageId);
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

            {(listing.waterBilling || listing.electricityBilling || listing.internetBilling || listing.securityDepositMonths !== undefined || listing.guarantorRequired !== undefined || listing.minimumLeaseMonths !== undefined) && (
              <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-ink">Costos y requisitos declarados</h2>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  {listing.securityDepositMonths !== undefined && <InfoLine label="Depósito" value={`${listing.securityDepositMonths} ${listing.securityDepositMonths === 1 ? 'mes' : 'meses'}`} />}
                  {listing.minimumLeaseMonths !== undefined && <InfoLine label="Plazo mínimo" value={`${listing.minimumLeaseMonths} meses`} />}
                  {listing.guarantorRequired !== undefined && <InfoLine label="Aval" value={listing.guarantorRequired ? 'Requerido' : 'No indicado como requisito'} />}
                  {listing.proofIncomeRequired !== undefined && <InfoLine label="Comprobante de ingresos" value={listing.proofIncomeRequired ? 'Requerido' : 'No indicado como requisito'} />}
                  <UtilityInfo label="Agua" billing={listing.waterBilling} cost={listing.waterMonthlyCost} />
                  <UtilityInfo label="Luz" billing={listing.electricityBilling} cost={listing.electricityMonthlyCost} />
                  <UtilityInfo label="Internet" billing={listing.internetBilling} cost={listing.internetMonthlyCost} />
                </div>
                {listing.rentalRequirementsNotes && <p className="mt-3 text-sm text-ink-600">Otros requisitos: {listing.rentalRequirementsNotes}</p>}
                <p className="mt-4 border-t border-cream-200 pt-3 text-xs text-ink-400">Importes y requisitos los declara quien publica. Confírmalos directamente antes de acordar.</p>
              </section>
            )}

            {(listing.stepFreeAccess || listing.rampAccess || listing.accessibleBathroom || listing.elevatorAccess) && (
              <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-lg font-bold text-ink">Accesibilidad</h2>
                <div className="flex flex-wrap gap-2 text-sm">
                  {listing.stepFreeAccess && <span className="rounded-full bg-brand-50 px-3 py-1.5 text-brand-800">Acceso sin escalones</span>}
                  {listing.rampAccess && <span className="rounded-full bg-brand-50 px-3 py-1.5 text-brand-800">Rampa</span>}
                  {listing.accessibleBathroom && <span className="rounded-full bg-brand-50 px-3 py-1.5 text-brand-800">Baño accesible</span>}
                  {listing.elevatorAccess && <span className="rounded-full bg-brand-50 px-3 py-1.5 text-brand-800">Elevador</span>}
                </div>
                <p className="mt-3 text-xs text-ink-400">Características declaradas; solicita confirmación y medidas específicas.</p>
              </section>
            )}

            {(listing.alcoholConsumptionAllowed !== undefined || listing.alcoholSalesAllowed !== undefined || listing.commercialActivityAllowed !== undefined || listing.shortStayUse) && (
              <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-lg font-bold text-ink">Reglas de la casa</h2>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  {listing.alcoholConsumptionAllowed !== undefined && <InfoLine label="Consumo en el inmueble" value={listing.alcoholConsumptionAllowed ? 'Permitido según quien publica' : 'No permitido según quien publica'} />}
                  {listing.alcoholSalesAllowed !== undefined && <InfoLine label="Venta de bebidas alcohólicas" value={listing.alcoholSalesAllowed ? 'Permitida según quien publica' : 'No permitida según quien publica'} />}
                  {listing.commercialActivityAllowed !== undefined && <InfoLine label="Venta de comida u otros productos" value={listing.commercialActivityAllowed ? 'Permitida según quien publica' : 'No permitida según quien publica'} />}
                </div>
                {listing.commercialActivityNotes && <p className="mt-3 text-sm text-ink-600">Condiciones declaradas: {listing.commercialActivityNotes}</p>}
                {listing.shortStayUse && <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950"><strong>Hospedaje o renta temporal</strong><p>{({ vacation: 'Vacaciones o descanso', events: 'Reuniones o eventos', both: 'Vacaciones y eventos', other: 'Otro uso permitido' } as const)[listing.shortStayUse]}</p>{listing.shortStayNotes && <p className="mt-1">{listing.shortStayNotes}</p>}</div>}
                <p className="mt-3 text-xs text-ink-400">Son condiciones declaradas por quien publica. La plataforma no verifica licencias o permisos; confirma los acuerdos y la normativa aplicable.</p>
              </section>
            )}

            {(listing.visitAvailability || listing.openHouseStartAt || listing.roommateWanted) && (
              <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-lg font-bold text-ink">Visitas y convivencia</h2>
                {listing.visitAvailability && <p className="text-sm text-ink-600">Horarios sugeridos: {listing.visitAvailability}</p>}
                {listing.openHouseStartAt && listing.openHouseEndAt && <div className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Casa abierta</strong><p>{new Date(listing.openHouseStartAt).toLocaleString('es-MX')} – {new Date(listing.openHouseEndAt).toLocaleString('es-MX')}</p>{listing.openHouseCapacity && <p>Aforo aproximado: {listing.openHouseCapacity}</p>}{listing.openHouseNotes && <p>{listing.openHouseNotes}</p>}<p className="mt-2 text-xs">Solicita asistencia por mensaje; el propietario debe confirmar y no se garantiza un lugar.</p></div>}
                {listing.roommateWanted && <div className="mt-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-900"><strong>Busca roomies</strong><dl className="mt-2 grid gap-2 sm:grid-cols-2"><div><dt className="text-brand-700">Personas que ya viven aquí</dt><dd className="font-semibold">{listing.currentOccupants ?? 'No indicado'}</dd></div><div><dt className="text-brand-700">Cupos que busca</dt><dd className="font-semibold">{listing.roommatesWantedCount ?? 'No indicado'}</dd></div><div><dt className="text-brand-700">Cuarto</dt><dd className="font-semibold">{listing.roommatePrivateRoom === undefined ? 'No indicado' : listing.roommatePrivateRoom ? 'Privado' : 'Compartido'}</dd></div><div><dt className="text-brand-700">Amueblado</dt><dd className="font-semibold">{listing.roommateFurnished === undefined ? 'No indicado' : listing.roommateFurnished ? 'Sí' : 'No'}</dd></div><div><dt className="text-brand-700">Baño compartido</dt><dd className="font-semibold">{listing.roommateSharedBathroom === undefined ? 'No indicado' : listing.roommateSharedBathroom ? 'Sí' : 'No'}</dd></div><div><dt className="text-brand-700">Cocina compartida</dt><dd className="font-semibold">{listing.roommateSharedKitchen === undefined ? 'No indicado' : listing.roommateSharedKitchen ? 'Sí' : 'No'}</dd></div></dl>{listing.roommatePreferences && <p className="mt-3">Convivencia: {listing.roommatePreferences}</p>}<p className="mt-2 text-xs">Coordina una conversación y visita antes de compartir documentos, llaves o dinero.</p></div>}
              </section>
            )}

            <InspectionChecklist listingId={listing.id} />

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

            {(listing.nearbyPlaces || listing.nearbyServices?.length || listing.safetyLevel || listing.waterIssueLevel || listing.transportAvailability) && (
              <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                  <Landmark className="h-5 w-5 text-brand-600" />
                  Entorno y servicios cercanos
                </h2>
                <div className="space-y-4">
                  {listing.nearbyPlaces && (
                    <div>
                      <h3 className="text-sm font-semibold text-ink-700">Lugares notables</h3>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-500">{listing.nearbyPlaces}</p>
                    </div>
                  )}
                  {listing.nearbyServices && listing.nearbyServices.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-ink-700">Servicios o referencias de la zona</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {listing.nearbyServices.map((service) => (
                          <span key={service} className="rounded-full bg-cream-100 px-3 py-1.5 text-xs font-medium text-ink-600">
                            {nearbyServiceLabel(service)}{service === 'other' && listing.nearbyServicesOther ? `: ${listing.nearbyServicesOther}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {listing.safetyLevel && (
                      <InfoBlock icon={<ShieldCheck className="h-4 w-4" />} title="Percepción de seguridad">
                        <p>{safetyLevelLabel(listing.safetyLevel)}</p>
                        {listing.safetyDetails && <p className="mt-1 text-xs">{listing.safetyDetails}</p>}
                      </InfoBlock>
                    )}
                    {listing.waterIssueLevel && (
                      <InfoBlock icon={<Droplets className="h-4 w-4" />} title="Servicio de agua">
                        <p>{waterIssueLabel(listing.waterIssueLevel)}</p>
                        {listing.waterIssueDetails && <p className="mt-1 text-xs">{listing.waterIssueDetails}</p>}
                      </InfoBlock>
                    )}
                    {listing.transportAvailability && (
                      <InfoBlock icon={<Bus className="h-4 w-4" />} title="Transporte público">
                        <p>{transportLabel(listing.transportAvailability)}</p>
                        {listing.transportDestinations && <p className="mt-1 text-xs">Rutas o destinos: {listing.transportDestinations}</p>}
                      </InfoBlock>
                    )}
                  </div>
                  <p className="border-t border-cream-200 pt-3 text-xs leading-relaxed text-ink-400">
                    Estos datos son proporcionados por quien publica y no son verificados ni garantizados por IxmiPlace. Confírmalos antes de tomar una decisión.
                  </p>
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
                {fbUser?.emailVerified && fbUser.uid !== listing.ownerId ? (
                  <>
                    <WhatsAppContactButton
                      listingId={listing.id}
                      className="group flex w-full items-center justify-center gap-2
                                 rounded-xl bg-gradient-to-r from-green-500 to-green-600
                                 py-3.5 font-semibold text-white
                                 shadow-lg shadow-green-500/30 transition
                                 hover:shadow-xl hover:shadow-green-500/40 hover:brightness-110"
                    />
                    <p className="mt-3 text-center text-xs text-ink-400">Contacto protegido para cuentas verificadas</p>
                  </>
                ) : fbUser?.uid === listing.ownerId ? (
                  <p className="text-center text-sm text-ink-500">Este es tu anuncio.</p>
                ) : (
                  <Link to="/login" className="flex w-full items-center justify-center rounded-xl bg-green-700 py-3.5 font-semibold text-white hover:bg-green-800">
                    Inicia sesión para contactar
                  </Link>
                )}
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
      {fbUser?.emailVerified && fbUser.uid !== listing.ownerId && (
        <WhatsAppContactButton
          listingId={listing.id}
          iconOnly
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center
                     rounded-full bg-gradient-to-br from-green-500 to-green-600
                     text-white shadow-2xl shadow-green-500/40
                     transition hover:scale-110 lg:hidden"
        />
      )}

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
          visitAvailability={listing.visitAvailability}
          openHouseStartAt={listing.openHouseStartAt}
          openHouseEndAt={listing.openHouseEndAt}
          onClose={() => setContactOpen(false)}
          onSubmit={submitContact}
        />
      )}
    </div>
  );
}

function toLocalDateTime(value: number) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 border-b border-cream-100 pb-2"><span className="text-ink-500">{label}</span><span className="text-right font-medium text-ink-700">{value}</span></div>;
}

function UtilityInfo({ label, billing, cost }: { label: string; billing?: 'included' | 'extra' | 'unknown'; cost?: number }) {
  if (!billing) return null;
  const value = billing === 'included' ? 'Incluido' : billing === 'extra' ? `Se paga aparte${cost !== undefined ? ` · aprox. $${cost.toLocaleString('es-MX')} MXN/mes` : ''}` : 'Sin información';
  return <InfoLine label={label} value={value} />;
}

function InspectionChecklist({ listingId }: { listingId: string }) {
  const checklist = [
    'Revisar humedad, techo, ventanas y cerraduras',
    'Probar presión de agua y preguntar por cortes',
    'Probar contactos, luces y servicios incluidos',
    'Confirmar depósito, renta, plazo y cargos por escrito',
    'Verificar identidad de quien ofrece y autorización para rentar',
    'Leer el contrato antes de entregar dinero o documentos',
  ];
  const key = `ixmiplace-inspection-${listingId}`;
  const [checked, setChecked] = useState<boolean[]>(() => {
    try { const saved = localStorage.getItem(key); const parsed = saved ? JSON.parse(saved) : []; return checklist.map((_, index) => parsed[index] === true); }
    catch { return checklist.map(() => false); }
  });
  function toggle(index: number) {
    const next = checked.map((value, current) => current === index ? !value : value);
    setChecked(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* almacenamiento opcional del dispositivo */ }
  }
  return <section className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm print:break-inside-avoid">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-ink">Lista para revisar antes de decidir</h2><button type="button" onClick={() => window.print()} className="text-sm font-semibold text-brand-700 underline print:hidden">Imprimir</button></div>
    <p className="mt-1 text-xs text-ink-400">Se guarda solo en este dispositivo; no se envía al propietario ni a IxmiPlace.</p>
    <ul className="mt-4 space-y-3">{checklist.map((item, index) => <li key={item}><label className="flex cursor-pointer items-start gap-3 text-sm text-ink-700"><input type="checkbox" checked={checked[index]} onChange={() => toggle(index)} className="mt-0.5 h-4 w-4 accent-brand-600" /><span className={checked[index] ? 'text-ink-400 line-through' : ''}>{item}</span></label></li>)}</ul>
  </section>;
}

const NEARBY_SERVICE_LABELS: Record<string, string> = {
  'hospital-clinic': 'Hospital o clínica',
  schools: 'Escuela',
  market: 'Mercado o supermercado',
  'public-transport': 'Transporte público',
  shops: 'Tiendas y comercios',
  parks: 'Parque o área recreativa',
  university: 'Universidad',
  downtown: 'Centro de la ciudad',
  balnearios: 'Balnearios',
  other: 'Otro lugar',
};

function nearbyServiceLabel(value: string) {
  return NEARBY_SERVICE_LABELS[value] ?? 'Otro lugar';
}

function safetyLevelLabel(value: NonNullable<Listing['safetyLevel']>) {
  return ({ quiet: 'La persona que publica la considera tranquila', mixed: 'La seguridad se reporta como variable', caution: 'Se recomienda tomar precauciones', unknown: 'Sin información disponible', other: 'Otra percepción reportada' })[value];
}

function waterIssueLabel(value: NonNullable<Listing['waterIssueLevel']>) {
  return ({ none: 'Sin problemas habituales reportados', occasional: 'Problemas ocasionales', frequent: 'Problemas frecuentes', severe: 'Problemas graves o suministro irregular', unknown: 'Sin información disponible', other: 'Otra situación reportada' })[value];
}

function transportLabel(value: NonNullable<Listing['transportAvailability']>) {
  return ({ nearby: 'Hay transporte cerca', limited: 'El servicio es limitado', none: 'No hay transporte cercano', unknown: 'Sin información disponible' })[value];
}

function InfoBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-cream-200 bg-cream-50 p-3 text-sm text-ink-500">
      <h3 className="mb-1 flex items-center gap-2 font-semibold text-ink-700">{icon}{title}</h3>
      {children}
    </div>
  );
}

function ContactDialog({
  sent,
  error,
  submitting,
  isSignedIn,
  ownerName,
  visitAvailability,
  openHouseStartAt,
  openHouseEndAt,
  onClose,
  onSubmit,
}: {
  sent: boolean;
  error: string;
  submitting: boolean;
  isSignedIn: boolean;
  ownerName: string;
  visitAvailability?: string;
  openHouseStartAt?: number;
  openHouseEndAt?: number;
  onClose: () => void;
  onSubmit: (data: InternalMessageInput & { website?: string }) => Promise<void>;
}) {
  const [subject, setSubject] = useState('Me interesa tu propiedad');
  const [message, setMessage] = useState('');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [website, setWebsite] = useState('');
  const [visitAt, setVisitAt] = useState('');
  const [rsvpOpenHouse, setRsvpOpenHouse] = useState(false);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-ink/40 p-3 backdrop-blur-sm sm:p-4">
      <div className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-cream-200 bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-6">
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
                <div className="mt-5"><PrivacyNoticeInline kind="contact" /></div>
                <HoneypotField value={website} onChange={setWebsite} />
                <label className="mt-5 block text-sm font-semibold text-ink-700">
                  Asunto
                  <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={100} className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 font-normal text-ink outline-none focus:border-brand-500" />
                </label>
                <label className="mt-4 block text-sm font-semibold text-ink-700">
                  Mensaje
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={5} placeholder="Hola, me interesa saber más sobre esta propiedad…" className="mt-2 w-full resize-none rounded-xl border border-cream-300 bg-cream-50 p-3 font-normal text-ink outline-none focus:border-brand-500" />
                </label>
                {visitAvailability && <p className="mt-3 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">Horarios sugeridos para visitar: {visitAvailability}</p>}
                {(visitAvailability || openHouseStartAt) && (
                  <label className="mt-4 block text-sm font-semibold text-ink-700">
                    Solicitar una visita (opcional)
                    <input type="datetime-local" value={visitAt} min={toLocalDateTime(Date.now() + 60_000)} onChange={(event) => setVisitAt(event.target.value)} className="mt-2 w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 font-normal text-ink outline-none focus:border-brand-500" />
                  </label>
                )}
                {openHouseStartAt && openHouseEndAt && openHouseEndAt > Date.now() && (
                  <label className="mt-4 flex items-start gap-2.5 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                    <input type="checkbox" checked={rsvpOpenHouse} onChange={(event) => setRsvpOpenHouse(event.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                    <span>Quiero solicitar asistencia a la casa abierta del {new Date(openHouseStartAt).toLocaleString('es-MX')} al {new Date(openHouseEndAt).toLocaleString('es-MX')}. El propietario debe confirmar.</span>
                  </label>
                )}
                <label className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-ink-500">
                  <input type="checkbox" checked={acceptedPrivacy} onChange={(event) => setAcceptedPrivacy(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
                  <span>Consiento compartir mi nombre, asunto, mensaje y la solicitud de visita o asistencia que indique con el propietario para que pueda responderme. <Link to="/aviso-de-privacidad" target="_blank" className="font-semibold text-brand-700 underline">Ver Aviso de Privacidad</Link>.</span>
                </label>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-cream-300 px-4 py-3 font-semibold text-ink-600 hover:bg-cream-100">Cancelar</button>
                  <button type="button" disabled={submitting || !acceptedPrivacy} onClick={() => void onSubmit({ subject: rsvpOpenHouse && !subject.trim() ? 'Solicitud para casa abierta' : subject, message: rsvpOpenHouse && !message.trim() ? 'Me gustaría asistir a la casa abierta, ¿puedes confirmar mi lugar?' : message, website, ...(visitAt ? { visitRequestedAt: new Date(visitAt).getTime() } : {}), ...(rsvpOpenHouse ? { openHouseRsvp: true } : {}) })} className="flex-1 rounded-xl bg-brand-500 px-4 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-60">{submitting ? 'Enviando…' : 'Enviar mensaje'}</button>
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
  onSubmit: (data: ReportInput & { website?: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState<ReportInput['reason']>('spam');
  const [comment, setComment] = useState('');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [website, setWebsite] = useState('');

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
                <div className="mt-5"><PrivacyNoticeInline kind="report" /></div>
                <HoneypotField value={website} onChange={setWebsite} />
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
                <label className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-ink-500">
                  <input type="checkbox" checked={acceptedPrivacy} onChange={(event) => setAcceptedPrivacy(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
                  <span>Consiento que el equipo administrador trate el reporte y los datos que incluya para revisar el anuncio. <Link to="/aviso-de-privacidad" target="_blank" className="font-semibold text-brand-700 underline">Ver Aviso de Privacidad</Link>.</span>
                </label>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-cream-300 px-4 py-3 font-semibold text-ink-600 hover:bg-cream-100">Cancelar</button>
                  <button type="button" disabled={submitting || !acceptedPrivacy} onClick={() => void onSubmit({ reason, comment, website })} className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60">{submitting ? 'Enviando…' : 'Enviar reporte'}</button>
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
          src={optimizedUrl(photos[current], 1600, 1000)}
          alt={title}
          loading="eager"
          fetchPriority="high"
          decoding="async"
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
              aria-label={`Mostrar foto ${i + 1} de ${title}`}
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
              <img src={optimizedUrl(url, 240, 160)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
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
