import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, PencilLine, X } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { LISTING_LIMITS, supportsHouseRules } from '../../lib/constants';
import { ListingForm } from './ListingForm';
import { ListingScenePreview } from './ListingScenePreview';
import type { ListingInput } from '../../lib/zod-schemas';
import type { Listing } from '../../types/models';
import { LISTING_CONSENT_VERSION, PRIVACY_NOTICE_VERSION, TERMS_VERSION } from '../legal/legalVersions';
import { requestPushDelivery } from '../../lib/push-notifications';
import { isConfiguredCloudinaryPhotoUrl } from '../../lib/cloudinary';
import { listingCreateRuleErrors } from './listingCreateRuleChecks.js';
import { postAuthenticatedApi } from '../../lib/protected-api';

export function CreateListingPage() {
  const nav = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<ListingInput['category']>('casa');
  const [success, setSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [pendingPublish, setPendingPublish] = useState<{
    data: ListingInput;
    photos: string[];
    photoPublicIds: string[];
  } | null>(null);

  async function handleSubmit(
    data: ListingInput,
    photos: string[],
    photoPublicIds: string[] = []
  ) {
    const user = auth.currentUser;
    if (!user) throw new Error('PUBLICATION_CHECK:Tu sesión expiró. Inicia sesión de nuevo.');
    if (!data.publicationConsentAccepted) {
      throw new Error('PUBLICATION_CHECK:Confirma que tienes autorización para publicar este anuncio.');
    }

    // Actualiza los claims antes de la escritura: Firestore evalúa email_verified
    // en el token, no el campo espejo emailVerified del perfil.
    const token = await user.getIdTokenResult(true);
    if (token.claims.email_verified !== true) {
      throw new Error('PUBLICATION_CHECK:Firebase aún no reconoce el correo como verificado. Cierra sesión y vuelve a entrar después de verificarlo.');
    }
    if (user.email?.toLowerCase().endsWith('@dominio-temporal.com')) {
      throw new Error('PUBLICATION_CHECK:Esta cuenta no puede publicar con un correo temporal.');
    }

    let profileSnapshot;
    try {
      profileSnapshot = await getDoc(doc(db, 'users', user.uid));
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error
        && typeof error.code === 'string' ? error.code : '';
      if (code === 'permission-denied') {
        throw new Error('PUBLICATION_CHECK:Firebase no permitió leer tu perfil. El sitio podría estar conectado a otro proyecto o las reglas desplegadas podrían diferir de las del código.');
      }
      throw error;
    }
    if (!profileSnapshot.exists()) {
      throw new Error('PUBLICATION_CHECK:No encontramos tu perfil en esta base de datos. Verifica que el sitio esté conectado al proyecto Firebase correcto.');
    }
    const profile = profileSnapshot.data();
    if (profile.isBanned === true) {
      throw new Error('PUBLICATION_CHECK:Esta cuenta no tiene permiso para publicar.');
    }
    if (profile.termsAcceptedVersion !== TERMS_VERSION
      || profile.adultConfirmedVersion !== TERMS_VERSION
      || profile.privacyConsentVersion !== PRIVACY_NOTICE_VERSION) {
      throw new Error('PUBLICATION_CHECK:Actualiza la aceptación de Términos, mayoría de edad y Aviso de Privacidad en tu cuenta antes de publicar.');
    }
    if (!/^\d{10}$/.test(data.whatsapp)) {
      throw new Error('PUBLICATION_CHECK:El WhatsApp debe tener exactamente 10 dígitos.');
    }
    if (photos.length < LISTING_LIMITS.photosMin || photos.length > LISTING_LIMITS.photosMax
      || photos.some((url) => !isConfiguredCloudinaryPhotoUrl(url))) {
      throw new Error('PUBLICATION_CHECK:Una o más fotos no corresponden a la cuenta de Cloudinary configurada para este sitio. Vuelve a seleccionarlas.');
    }

    const now = Date.now();
    const listing: Omit<Listing, 'id'> = {
      ownerId: user.uid,
      ownerEmailVerified: token.claims.email_verified === true,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      operation: data.operation,
      price: data.price,
      colonia: data.colonia.trim(),
      lat: data.lat,
      lng: data.lng,
      showPhone: data.showPhone ?? true,
      photos,
      status: 'pending',
      availability: data.availability ?? 'available',
      availabilityConfirmedAt: now,
      expiresAt: now + LISTING_LIMITS.activeDays * 24 * 60 * 60 * 1000,
      reportsCount: 0,
      viewsCount: 0,
      whatsappContactsCount: 0,
      favoritesCount: 0,
      createdAt: now,
      updatedAt: now,
      publicationConsentVersion: LISTING_CONSENT_VERSION,
    };

    // Firestore rechaza `undefined`: los opcionales solo se agregan si tienen valor.
    if (photoPublicIds.length > 0) listing.photoPublicIds = photoPublicIds;
    if (data.priceUnit) listing.priceUnit = data.priceUnit;
    if (data.bedrooms && data.bedrooms > 0) listing.bedrooms = data.bedrooms;
    if (data.bathrooms && data.bathrooms > 0) listing.bathrooms = data.bathrooms;
    if (data.parkingSpots && data.parkingSpots > 0)
      listing.parkingSpots = data.parkingSpots;
    if (data.areaM2 && data.areaM2 > 0) listing.areaM2 = data.areaM2;
    if (data.amenities && data.amenities.length > 0)
      listing.amenities = data.amenities;

    if (data.nearbyPlaces?.trim()) listing.nearbyPlaces = data.nearbyPlaces.trim();
    if (data.nearbyServices?.length) listing.nearbyServices = data.nearbyServices;
    if (data.nearbyServices?.includes('other') && data.nearbyServicesOther?.trim()) listing.nearbyServicesOther = data.nearbyServicesOther.trim();
    if (data.safetyLevel) listing.safetyLevel = data.safetyLevel;
    if (['other', 'mixed', 'caution'].includes(data.safetyLevel ?? '') && data.safetyDetails?.trim()) listing.safetyDetails = data.safetyDetails.trim();
    if (data.waterIssueLevel) listing.waterIssueLevel = data.waterIssueLevel;
    if (['occasional', 'frequent', 'severe', 'other'].includes(data.waterIssueLevel ?? '') && data.waterIssueDetails?.trim()) listing.waterIssueDetails = data.waterIssueDetails.trim();
    if (data.transportAvailability) listing.transportAvailability = data.transportAvailability;
    if (data.transportDestinations?.trim()) listing.transportDestinations = data.transportDestinations.trim();

    // Reglas de la casa: solo se guardan cuando aplican a la categoría/operación.
    if (supportsHouseRules(data.category, data.operation)) {
      listing.childrenAllowed = data.childrenAllowed ?? true;
      listing.petsAllowed = data.petsAllowed ?? false;
      listing.smokingAllowed = data.smokingAllowed ?? false;
      if (data.maxGuests && data.maxGuests > 0) listing.maxGuests = data.maxGuests;
    }
    if (data.operation !== 'venta' && (supportsHouseRules(data.category, data.operation) || data.category === 'local')) {
      listing.alcoholConsumptionAllowed = data.alcoholConsumptionAllowed ?? false;
      listing.alcoholSalesAllowed = data.alcoholSalesAllowed ?? false;
      listing.commercialActivityAllowed = data.commercialActivityAllowed ?? false;
      if (data.commercialActivityAllowed && data.commercialActivityNotes?.trim()) listing.commercialActivityNotes = data.commercialActivityNotes.trim();
    }

    const optionalListingFields: (keyof ListingInput)[] = [
      'securityDepositMonths', 'guarantorRequired', 'proofIncomeRequired', 'minimumLeaseMonths',
      'waterBilling', 'waterMonthlyCost', 'electricityBilling', 'electricityMonthlyCost',
      'internetBilling', 'internetMonthlyCost', 'stepFreeAccess', 'rampAccess',
      'accessibleBathroom', 'elevatorAccess', 'openHouseStartAt', 'openHouseEndAt',
      'openHouseCapacity', 'roommateWanted',
    ];
    const rentalOnlyFields: (keyof ListingInput)[] = [
      'securityDepositMonths', 'guarantorRequired', 'proofIncomeRequired', 'minimumLeaseMonths',
      'waterBilling', 'waterMonthlyCost', 'electricityBilling', 'electricityMonthlyCost',
      'internetBilling', 'internetMonthlyCost', 'rentalRequirementsNotes',
    ];
    for (const key of optionalListingFields) {
      if (rentalOnlyFields.includes(key) && data.operation === 'venta') continue;
      const value = data[key];
      if (value !== undefined) Object.assign(listing, { [key]: value });
    }
    if (data.rentalRequirementsNotes?.trim()) listing.rentalRequirementsNotes = data.rentalRequirementsNotes.trim();
    if (data.visitAvailability?.trim()) listing.visitAvailability = data.visitAvailability.trim();
    if (data.openHouseNotes?.trim()) listing.openHouseNotes = data.openHouseNotes.trim();
    if (data.roommateWanted && data.roommatePreferences?.trim()) listing.roommatePreferences = data.roommatePreferences.trim();
    if (data.shortStayUse) listing.shortStayUse = data.shortStayUse;
    if (data.shortStayNotes?.trim()) listing.shortStayNotes = data.shortStayNotes.trim();
    if (data.category !== 'hotel' && data.category !== 'motel') {
      listing.stepFreeAccess = data.stepFreeAccess ?? false;
      listing.rampAccess = data.rampAccess ?? false;
      listing.accessibleBathroom = data.accessibleBathroom ?? false;
      listing.elevatorAccess = data.elevatorAccess ?? false;
    }

    if (data.category === 'hotel' || data.category === 'motel') {
      if (data.establishmentName?.trim()) listing.establishmentName = data.establishmentName.trim();
      if (data.roomType?.trim()) listing.roomType = data.roomType.trim();
      if (data.stayDurationHours) listing.stayDurationHours = data.stayDurationHours;
      if (data.checkInTime) listing.checkInTime = data.checkInTime;
      if (data.checkOutTime) listing.checkOutTime = data.checkOutTime;
      listing.reception24h = data.reception24h ?? false;
      listing.foodAvailable = data.foodAvailable ?? false;
      if (data.foodAvailable && data.foodDescription?.trim()) listing.foodDescription = data.foodDescription.trim();
    }

    const privateDetails = {
      ownerId: user.uid,
      ...(data.address?.trim() ? { address: data.address.trim() } : {}),
      whatsapp: data.whatsapp,
      updatedAt: now,
    };
    const ruleErrors = listingCreateRuleErrors(
      listing as unknown as Record<string, unknown>,
      privateDetails,
      user.uid,
      now,
    );
    if (ruleErrors.length > 0) {
      throw new Error(`PUBLICATION_CHECK:No se envió el anuncio porque no coincide con las reglas activas: ${ruleErrors.join(' ')}`);
    }

    const { listingId } = await postAuthenticatedApi<{ listingId: string }>(
      '/api/create-listing',
      {
        listing,
        privateDetails,
        publicationConsentAccepted: data.publicationConsentAccepted === true,
        projectId: db.app.options.projectId,
      },
    );

    // La publicación ya se creó: un fallo del push no debe mostrarse como error
    // (el usuario reintentaría y duplicaría el anuncio).
    try {
      await requestPushDelivery('listing_created', listingId);
    } catch (err) {
      console.warn('No se pudo solicitar la notificación push:', err);
    }

    setSuccess(true);
    setTimeout(() => nav('/mis-publicaciones', { replace: true }), 1500);
  }

  const handleConfirmPublish = async () => {
    if (!pendingPublish || publishing) return;
    setPublishing(true);
    setPublishError('');
    try {
      await handleSubmit(
        pendingPublish.data,
        pendingPublish.photos,
        pendingPublish.photoPublicIds
      );
    } catch (err) {
      console.error('Error publicando anuncio:', err);
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.startsWith('PUBLICATION_CHECK:')) {
        setPublishError(errorMessage.slice('PUBLICATION_CHECK:'.length));
      } else {
        setPublishError('No se pudo guardar el anuncio. Comprueba tu conexión e inténtalo de nuevo.');
      }
    } finally {
      setPublishing(false);
      setPendingPublish(null);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
        <div>
          <div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full
                       bg-gradient-to-br from-brand-400 to-brand-600 text-5xl
                       shadow-2xl shadow-brand-500/40"
          >
            ✅
          </div>
          <h1 className="mt-6 text-3xl font-bold text-ink">
            ¡Publicación enviada!
          </h1>
          <p className="mt-3 text-ink-500">
            Tu propiedad está en revisión. Te avisaremos cuando sea aprobada.
          </p>
          <p className="mt-6 text-sm text-ink-400">Redirigiendo…</p>

          <div
            className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl border border-amber-200
                       bg-amber-50 p-4 text-left text-sm text-amber-900 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Importante</p>
                <p className="mt-1 leading-relaxed">Despues de publicar no podras cambiar categoria, operacion, zona ni WhatsApp. En hoteles y moteles podras cambiar la tarifa, disponibilidad y servicios.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pt-24 pb-12">
      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full
                       border border-accent-300 bg-accent-50 px-4 py-1.5
                       text-xs font-medium text-accent-700"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500" />
            Publicación gratuita
          </div>

          <h1
            className="text-4xl font-extrabold text-ink sm:text-5xl"
          >
            Publica tu propiedad
          </h1>

          <p className="mx-auto mt-3 max-w-md text-ink-500">
            Llena el formulario. Tu anuncio será revisado y publicado en minutos.
          </p>
          <Link to="/publicar-roomie" className="mt-4 inline-flex rounded-full border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-50">¿Buscas roomie? Usa el formulario independiente →</Link>
        </div>

        {publishError && (
          <div
            role="alert"
            className="mx-auto mb-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <span>{publishError}</span>
          </div>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="min-w-0">
            <ListingForm
              onSubmit={handleSubmit}
              onCategoryChange={setSelectedCategory}
              submitLabel="Publicar propiedad"
              requireConfirmation={true}
              onConfirmSubmit={(data, photos, photoPublicIds) => {
                setPublishError('');
                setPendingPublish({ data, photos, photoPublicIds });
              }}
            />
          </div>
          <div className="hidden min-w-0 lg:block">
            <div className="sticky top-24">
              <ListingScenePreview category={selectedCategory} />
            </div>
          </div>
        </div>
      </div>

      {pendingPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-cream-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <button
                type="button"
                onClick={() => setPendingPublish(null)}
                disabled={publishing}
                className="rounded-full p-1.5 text-ink-400 transition hover:bg-cream-100 hover:text-ink-600 disabled:opacity-50"
                aria-label="Cerrar confirmación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2 className="mt-4 text-xl font-bold text-ink">
              ¿Estás de acuerdo con esta decisión?
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-ink-600">Al publicar no podras cambiar categoria, operacion, zona, ubicacion ni WhatsApp. En hoteles y moteles podras actualizar la tarifa, disponibilidad y servicios de cada habitacion.</p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingPublish(null)}
                disabled={publishing}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 py-3 font-semibold text-ink-600 transition hover:bg-cream-100 disabled:opacity-50"
              >
                <PencilLine className="h-4 w-4" />
                Seguir editando
              </button>

              <button
                type="button"
                onClick={handleConfirmPublish}
                disabled={publishing}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {publishing ? 'Publicando…' : 'Sí, crearla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
