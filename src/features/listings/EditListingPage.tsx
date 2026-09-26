import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { collection, doc, getDoc, deleteField, writeBatch } from 'firebase/firestore';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { ListingForm } from './ListingForm';
import type { ListingInput } from '../../lib/zod-schemas';
import type { Listing } from '../../types/models';

type LoadState = 'loading' | 'ready' | 'not-found' | 'forbidden' | 'error';

export function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [state, setState] = useState<LoadState>('loading');
  const [listing, setListing] = useState<Listing | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id || !auth.currentUser) {
        setState('not-found');
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'listings', id));

        if (!snap.exists()) {
          setState('not-found');
          return;
        }

        const data = { id: snap.id, ...(snap.data() as Omit<Listing, 'id'>) };

        // Solo el dueño puede editar (las reglas de Firestore también lo
        // protegen, pero validamos aquí para dar un mensaje claro en la UI)
        if (data.ownerId !== auth.currentUser.uid) {
          setState('forbidden');
          return;
        }

        const privateDetailsSnap = await getDoc(doc(db, 'listingPrivateDetails', id));
        setListing({
          ...data,
          address:
            privateDetailsSnap.data()?.address ??
            data.address ??
            '',
        });
        setState('ready');
      } catch (err) {
        console.error('Error cargando publicación para editar:', err);
        setState('error');
      }
    }

    load();
  }, [id]);

  async function handleSubmit(
    data: ListingInput,
    photos: string[],
    photoPublicIds: string[] = []
  ) {
    if (!id || !auth.currentUser || !listing) throw new Error('No se pudo editar');

    const lockedChanged =
      data.category !== listing.category ||
      data.operation !== listing.operation ||
      ((listing.category !== 'hotel' && listing.category !== 'motel') && data.price !== listing.price) ||
      data.colonia.trim() !== listing.colonia.trim() ||
      data.whatsapp !== listing.whatsapp ||
      data.lat !== (listing.lat ?? 20.4833) ||
      data.lng !== (listing.lng ?? -99.2167);

    if (lockedChanged) {
      throw new Error(
        'No puedes cambiar la categoría, operación, zona, precio, ubicación o WhatsApp después de publicar.'
      );
    }

    // 🔧 Actualización PARCIAL (updateDoc), no reemplazamos el documento
    // completo: así no tocamos status, availability, reportsCount,
    // favoritesCount, approvedBy, createdAt, etc.
    const updates: Record<string, unknown> = {
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
      availability: data.availability ?? listing.availability,
      availabilityConfirmedAt: Date.now(),
      photos,
      photoPublicIds: photoPublicIds.length > 0 ? photoPublicIds : deleteField(),
      ownerEmailVerified: listing.ownerEmailVerified ?? auth.currentUser.emailVerified,
      updatedAt: Date.now(),
    };

    // Campos opcionales: si tienen valor, se actualizan;
    // si quedaron vacíos, se eliminan del documento con deleteField()
    updates.priceUnit = data.priceUnit ?? deleteField();
    updates.bedrooms = data.bedrooms && data.bedrooms > 0 ? data.bedrooms : deleteField();
    updates.bathrooms = data.bathrooms && data.bathrooms > 0 ? data.bathrooms : deleteField();
    updates.parkingSpots =
      data.parkingSpots && data.parkingSpots > 0 ? data.parkingSpots : deleteField();
    updates.areaM2 = data.areaM2 && data.areaM2 > 0 ? data.areaM2 : deleteField();
    updates.amenities =
      data.amenities && data.amenities.length > 0 ? data.amenities : deleteField();
    if (listing.category === 'hotel' || listing.category === 'motel') {
      updates.price = data.price;
      updates.establishmentName = data.establishmentName?.trim() || deleteField();
      updates.roomType = data.roomType?.trim() || deleteField();
      updates.stayDurationHours = data.stayDurationHours ?? deleteField();
      updates.checkInTime = data.checkInTime || deleteField();
      updates.checkOutTime = data.checkOutTime || deleteField();
      updates.reception24h = data.reception24h ?? false;
      updates.foodAvailable = data.foodAvailable ?? false;
      updates.foodDescription = data.foodAvailable && data.foodDescription?.trim()
        ? data.foodDescription.trim()
        : deleteField();
    }

    const changedFields = Object.keys(updates).filter((field) => field !== 'updatedAt');
    if ((data.address?.trim() ?? '') !== (listing.address?.trim() ?? '')) {
      changedFields.push('address');
    }
    const batch = writeBatch(db);
    batch.update(doc(db, 'listings', id), updates);
    const privateDetailsRef = doc(db, 'listingPrivateDetails', id);
    batch.set(
      privateDetailsRef,
      {
        ownerId: auth.currentUser.uid,
        address: data.address?.trim() ?? '',
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    batch.set(doc(collection(db, 'listingHistory')), {
      listingId: id,
      actorId: auth.currentUser.uid,
      actorRole: 'owner',
      action: 'updated',
      changedFields,
      summary: `El propietario actualizó ${changedFields.length} campo(s).`,
      createdAt: Date.now(),
    });
    await batch.commit();

    setSuccess(true);
    setTimeout(() => nav('/mis-publicaciones', { replace: true }), 1500);
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="flex flex-col items-center text-ink-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-3 text-sm">Cargando publicación…</p>
        </div>
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <ErrorScreen
        title="Publicación no encontrada"
        message="Es posible que haya sido eliminada o el enlace sea incorrecto."
      />
    );
  }

  if (state === 'forbidden') {
    return (
      <ErrorScreen
        title="No puedes editar esta publicación"
        message="Solo el dueño de la publicación puede modificarla."
      />
    );
  }

  if (state === 'error') {
    return (
      <ErrorScreen
        title="Ocurrió un error"
        message="No se pudo cargar la publicación. Intenta de nuevo más tarde."
      />
    );
  }

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
            ¡Publicación actualizada!
          </h1>
          <p className="mt-3 text-ink-500">
            Los cambios se guardaron correctamente.
          </p>
          <p className="mt-6 text-sm text-ink-400">Redirigiendo…</p>
        </div>
      </div>
    );
  }

  // state === 'ready' && listing existe
  return (
    <div className="min-h-screen bg-cream pt-24 pb-12">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/mis-publicaciones"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a mis publicaciones
        </Link>

        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-ink sm:text-5xl">
            Editar publicación
          </h1>
          <p className="mx-auto mt-3 max-w-md text-ink-500">
            Actualiza la información de tu propiedad.
          </p>
        </div>

        <ListingForm
          defaultValues={{
            title: listing!.title,
            description: listing!.description,
            category: listing!.category,
            operation: listing!.operation,
            price: listing!.price,
            priceUnit: listing!.priceUnit,
            colonia: listing!.colonia,
            address: listing!.address ?? '',
            whatsapp: listing!.whatsapp,
            bedrooms: listing!.bedrooms ?? 0,
            bathrooms: listing!.bathrooms ?? 0,
            parkingSpots: listing!.parkingSpots ?? 0,
            areaM2: listing!.areaM2,
            amenities: listing!.amenities ?? [],
            showPhone: listing!.showPhone,
            availability: listing!.availability,
            establishmentName: listing!.establishmentName ?? '',
            roomType: listing!.roomType ?? '',
            stayDurationHours: listing!.stayDurationHours ?? 3,
            checkInTime: listing!.checkInTime ?? '15:00',
            checkOutTime: listing!.checkOutTime ?? '12:00',
            reception24h: listing!.reception24h ?? false,
            foodAvailable: listing!.foodAvailable ?? false,
            foodDescription: listing!.foodDescription ?? '',
            lat: listing!.lat ?? 20.4833,
            lng: listing!.lng ?? -99.2167,
            photos: listing!.photos,
            photoPublicIds: listing!.photoPublicIds ?? [],
          }}
          onSubmit={handleSubmit}
          submitLabel="Guardar cambios"
          lockFixedFields={true}
          lockPrice={listing!.category !== 'hotel' && listing!.category !== 'motel'}
          immutableFieldsMessage={listing!.category === 'hotel' || listing!.category === 'motel' ? 'Categoria, ubicacion y WhatsApp quedan fijos. Puedes actualizar la tarifa, los servicios y la disponibilidad.' : 'Estos datos quedan fijos al publicar. Crea otra publicacion si necesitas cambiarlos.'}
        />
      </div>
    </div>
  );
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 text-center">
      <div>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertCircle className="h-9 w-9" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-ink-500">{message}</p>
        <Link
          to="/mis-publicaciones"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500
                     px-5 py-3 font-semibold text-white shadow-lg shadow-brand-500/30
                     transition hover:bg-brand-600"
        >
          <ArrowLeft className="h-5 w-5" />
          Volver a mis publicaciones
        </Link>
      </div>
    </div>
  );
}
