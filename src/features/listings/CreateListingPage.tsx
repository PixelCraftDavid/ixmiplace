import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { AlertTriangle, CheckCircle2, PencilLine, X } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { LISTING_LIMITS } from '../../lib/constants';
import { ListingForm } from './ListingForm';
import { ListingScenePreview } from './ListingScenePreview';
import type { ListingInput } from '../../lib/zod-schemas';
import type { Listing } from '../../types/models';
import { LISTING_CONSENT_VERSION } from '../legal/legalVersions';

export function CreateListingPage() {
  const nav = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<ListingInput['category']>('casa');
  const [success, setSuccess] = useState(false);
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
    if (!auth.currentUser) throw new Error('Sesión expirada');
    if (!data.publicationConsentAccepted) throw new Error('Debes confirmar tu autorización para publicar este anuncio.');

    const now = Date.now();
    const listing: Omit<Listing, 'id'> = {
      ownerId: auth.currentUser.uid,
      ownerEmailVerified: auth.currentUser.emailVerified,
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      operation: data.operation,
      price: data.price,
      colonia: data.colonia.trim(),
      lat: data.lat,
      lng: data.lng,
      whatsapp: data.whatsapp,
      showPhone: data.showPhone ?? true,
      photos,
      photoPublicIds: photoPublicIds.length > 0 ? photoPublicIds : undefined,
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
      publicationConsentAt: now,
    };

    if (data.priceUnit) listing.priceUnit = data.priceUnit;
    if (data.bedrooms && data.bedrooms > 0) listing.bedrooms = data.bedrooms;
    if (data.bathrooms && data.bathrooms > 0) listing.bathrooms = data.bathrooms;
    if (data.parkingSpots && data.parkingSpots > 0)
      listing.parkingSpots = data.parkingSpots;
    if (data.areaM2 && data.areaM2 > 0) listing.areaM2 = data.areaM2;
    if (data.amenities && data.amenities.length > 0)
      listing.amenities = data.amenities;
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

    const listingRef = doc(collection(db, 'listings'));
    const batch = writeBatch(db);
    batch.set(listingRef, listing);
    if (data.address?.trim()) {
      batch.set(doc(db, 'listingPrivateDetails', listingRef.id), {
        ownerId: auth.currentUser.uid,
        address: data.address.trim(),
        updatedAt: now,
      });
    }
    await batch.commit();

    setSuccess(true);
    setTimeout(() => nav('/mis-publicaciones', { replace: true }), 1500);
  }

  const handleConfirmPublish = async () => {
    if (!pendingPublish) return;
    setPendingPublish(null);
    await handleSubmit(
      pendingPublish.data,
      pendingPublish.photos,
      pendingPublish.photoPublicIds
    );
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
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="min-w-0">
            <ListingForm
              onSubmit={handleSubmit}
              onCategoryChange={setSelectedCategory}
              submitLabel="Publicar propiedad"
              requireConfirmation={true}
              onConfirmSubmit={(data, photos, photoPublicIds) => {
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
                className="rounded-full p-1.5 text-ink-400 transition hover:bg-cream-100 hover:text-ink-600"
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
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-cream-300 bg-white px-4 py-3 font-semibold text-ink-600 transition hover:bg-cream-100"
              >
                <PencilLine className="h-4 w-4" />
                Seguir editando
              </button>

              <button
                type="button"
                onClick={handleConfirmPublish}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:brightness-110"
              >
                <CheckCircle2 className="h-4 w-4" />
                Sí, crearla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
