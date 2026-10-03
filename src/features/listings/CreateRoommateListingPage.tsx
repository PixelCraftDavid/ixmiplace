import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ArrowLeft, BedDouble, Check, Info, Loader2, MapPin, Users } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { LISTING_LIMITS } from '../../lib/constants';
import { roommateListingSchema, type RoommateListingInput } from '../../lib/zod-schemas';
import type { Listing } from '../../types/models';
import { LISTING_CONSENT_VERSION } from '../legal/legalVersions';
import { PrivacyNoticeInline } from '../../components/legal/PrivacyNoticeInline';
import { ImageUploader } from './ImageUploader';
import { HoneypotField } from '../../components/ui/HoneypotField';

const inputClass = 'w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-ink placeholder-ink-300 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15';

export function CreateRoommateListingPage() {
  const nav = useNavigate();
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoPublicIds, setPhotoPublicIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [website, setWebsite] = useState('');
  const { register, handleSubmit, watch, control, formState: { errors, isSubmitting } } = useForm<RoommateListingInput>({
    resolver: standardSchemaResolver(roommateListingSchema),
    defaultValues: {
      title: '', description: '', price: undefined, colonia: '',
      whatsapp: auth.currentUser?.phoneNumber?.replace(/\D/g, '').slice(-10) ?? '',
      currentOccupants: 1, roommatesWantedCount: 1, roommatePrivateRoom: true,
      roommateFurnished: false, roommateSharedBathroom: true, roommateSharedKitchen: true,
      roommateAuthorizationConfirmed: false,
      petsAllowed: false, smokingAllowed: false, alcoholConsumptionAllowed: false,
      alcoholSalesAllowed: false, commercialActivityAllowed: false, commercialActivityNotes: '',
      roommatePreferences: '', waterBilling: 'unknown', electricityBilling: 'unknown',
      internetBilling: 'unknown', publicationConsentAccepted: false,
    },
  });
  const commercialActivityAllowed = watch('commercialActivityAllowed');

  async function submit(data: RoommateListingInput) {
    setSubmitError('');
    if (website.trim()) return;
    if (!auth.currentUser) {
      setSubmitError('Tu sesión expiró. Inicia sesión de nuevo.');
      return;
    }
    if (photos.length < LISTING_LIMITS.photosMin) {
      setSubmitError('Agrega al menos una foto del espacio.');
      return;
    }

    const now = Date.now();
    // Se usa un punto común del municipio, no la ubicación de la vivienda.
    // El contacto queda en listingPrivateDetails.
    const listing: Omit<Listing, 'id'> = {
      ownerId: auth.currentUser.uid,
      ownerEmailVerified: auth.currentUser.emailVerified,
      title: data.title.trim(),
      description: data.description.trim(),
      category: 'cuarto',
      operation: 'renta',
      price: data.price,
      priceUnit: 'mes',
      colonia: data.colonia.trim(),
      // Punto municipal común para las publicaciones de roomie. No se guarda
      // ni se muestra la ubicación precisa del domicilio.
      lat: 20.4833,
      lng: -99.2167,
      bedrooms: 1,
      maxGuests: data.currentOccupants + data.roommatesWantedCount,
      availability: 'available',
      availabilityConfirmedAt: now,
      expiresAt: now + LISTING_LIMITS.activeDays * 24 * 60 * 60 * 1000,
      photos,
      ...(photoPublicIds.length ? { photoPublicIds } : {}),
      showPhone: false,
      roommateWanted: true,
      currentOccupants: data.currentOccupants,
      roommatesWantedCount: data.roommatesWantedCount,
      roommatePrivateRoom: data.roommatePrivateRoom,
      roommateFurnished: data.roommateFurnished,
      roommateSharedBathroom: data.roommateSharedBathroom,
      roommateSharedKitchen: data.roommateSharedKitchen,
      roommateAuthorizationConfirmed: data.roommateAuthorizationConfirmed,
      roommatePreferences: data.roommatePreferences?.trim() ?? '',
      petsAllowed: data.petsAllowed,
      smokingAllowed: data.smokingAllowed,
      alcoholConsumptionAllowed: data.alcoholConsumptionAllowed,
      alcoholSalesAllowed: data.alcoholSalesAllowed,
      commercialActivityAllowed: data.commercialActivityAllowed,
      ...(data.commercialActivityAllowed && data.commercialActivityNotes?.trim()
        ? { commercialActivityNotes: data.commercialActivityNotes.trim() }
        : {}),
      waterBilling: data.waterBilling,
      ...(data.waterBilling === 'extra' ? { waterMonthlyCost: data.waterMonthlyCost } : {}),
      electricityBilling: data.electricityBilling,
      ...(data.electricityBilling === 'extra' ? { electricityMonthlyCost: data.electricityMonthlyCost } : {}),
      internetBilling: data.internetBilling,
      ...(data.internetBilling === 'extra' ? { internetMonthlyCost: data.internetMonthlyCost } : {}),
      status: 'pending',
      reportsCount: 0,
      viewsCount: 0,
      whatsappContactsCount: 0,
      favoritesCount: 0,
      createdAt: now,
      updatedAt: now,
      publicationConsentVersion: LISTING_CONSENT_VERSION,
      publicationConsentAt: serverTimestamp(),
    };

    try {
      const listingRef = doc(collection(db, 'listings'));
      const batch = writeBatch(db);
      batch.set(listingRef, listing);
      batch.set(doc(db, 'listingPrivateDetails', listingRef.id), {
        ownerId: auth.currentUser.uid,
        whatsapp: data.whatsapp,
        updatedAt: now,
      });
      await batch.commit();
      setSuccess(true);
      window.setTimeout(() => nav('/mis-publicaciones', { replace: true }), 1200);
    } catch (error) {
      console.error('No se pudo crear la búsqueda de roomie:', error);
      setSubmitError('No se pudo enviar la publicación. Revisa la conexión e intenta de nuevo.');
    }
  }

  if (success) return <main className="grid min-h-[70vh] place-items-center bg-cream px-5 pt-24 text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700"><Check /></div><h1 className="mt-5 text-3xl font-bold text-ink">Búsqueda enviada</h1><p className="mt-2 max-w-md text-ink-500">Quedó en revisión. El WhatsApp se conserva privado y el mapa solo muestra el centro de Ixmiquilpan.</p></div></main>;

  return (
    <main className="min-h-screen bg-cream px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/publicar" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Volver a publicar una propiedad</Link>
        <header className="my-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800"><Users className="h-3.5 w-3.5" /> Publicación gratuita</span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Busca un roomie</h1>
          <p className="mt-2 max-w-2xl text-ink-500">Publica el espacio que compartirás y cuántas personas buscas. No pongas dirección exacta, documentos ni información personal en el texto.</p>
        </header>
        <PrivacyNoticeInline kind="listing" />

        <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-6">
          <HoneypotField value={website} onChange={setWebsite} />
          <section className="space-y-4 rounded-2xl border border-ink-700/10 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><BedDouble className="h-5 w-5 text-brand-700" /> El espacio</h2>
            <Field label="Título" error={errors.title?.message}><input maxLength={80} className={inputClass} placeholder="Ej.: Busco roomie para departamento compartido" {...register('title')} /></Field>
            <Field label="Descripción" error={errors.description?.message}><textarea rows={4} maxLength={1500} className={`${inputClass} resize-y`} placeholder="Describe el lugar, áreas compartidas, dinámica de convivencia y desde cuándo está disponible." {...register('description')} /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Aportación mensual por persona (MXN)" error={errors.price?.message}><input type="number" min="1" max="10000000" step="1" className={inputClass} {...register('price', { valueAsNumber: true })} /></Field>
              <Field label="Personas que ya viven ahí" error={errors.currentOccupants?.message}><input type="number" min="1" max="30" className={inputClass} {...register('currentOccupants', { valueAsNumber: true })} /></Field>
              <Field label="Roomies que buscas" error={errors.roommatesWantedCount?.message}><input type="number" min="1" max="10" className={inputClass} {...register('roommatesWantedCount', { valueAsNumber: true })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Cuarto privado" {...register('roommatePrivateRoom')} />
              <Toggle label="Amueblado" {...register('roommateFurnished')} />
              <Toggle label="Baño compartido" {...register('roommateSharedBathroom')} />
              <Toggle label="Cocina compartida" {...register('roommateSharedKitchen')} />
            </div>
            <Field label="Colonia o zona aproximada" error={errors.colonia?.message}><input maxLength={80} className={inputClass} placeholder="Ej.: Centro" {...register('colonia')} /></Field>
            <p className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs text-brand-900"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />Por privacidad, el mapa público solo mostrará el centro de Ixmiquilpan. La colonia se muestra como referencia; no publiques la dirección exacta.</p>
          </section>

          <section className="space-y-4 rounded-2xl border border-ink-700/10 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-ink">Convivencia y reglas de la casa</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Se permiten mascotas" {...register('petsAllowed')} />
              <Toggle label="Se permite fumar" {...register('smokingAllowed')} />
              <Toggle label="Se permite consumir bebidas alcohólicas" {...register('alcoholConsumptionAllowed')} />
              <Toggle label="Se permite vender bebidas alcohólicas" {...register('alcoholSalesAllowed')} />
              <Toggle label="Se permite vender comida u otros productos desde el inmueble" {...register('commercialActivityAllowed')} />
            </div>
            {commercialActivityAllowed && <Field label="Condiciones para vender (opcional)" error={errors.commercialActivityNotes?.message}><textarea rows={2} maxLength={240} className={inputClass} placeholder="Horarios o condiciones acordadas" {...register('commercialActivityNotes')} /></Field>}
            <Field label="Preferencias de convivencia (opcional)" error={errors.roommatePreferences?.message}><textarea rows={3} maxLength={300} className={inputClass} placeholder="Horarios, limpieza, visitas o dinámica esperada. Evita pedir datos sensibles o usar criterios discriminatorios." {...register('roommatePreferences')} /></Field>
            <p className="text-xs text-ink-500">Las reglas reflejan lo que declara quien publica y no sustituyen acuerdos entre las personas ni permisos legales necesarios.</p>
          </section>

          <section className="space-y-4 rounded-2xl border border-ink-700/10 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-ink">Gastos y contacto</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Utility label="Agua" field="waterBilling" costField="waterMonthlyCost" register={register} control={control} inputClass={inputClass} errors={errors} />
              <Utility label="Luz" field="electricityBilling" costField="electricityMonthlyCost" register={register} control={control} inputClass={inputClass} errors={errors} />
              <Utility label="Internet" field="internetBilling" costField="internetMonthlyCost" register={register} control={control} inputClass={inputClass} errors={errors} />
            </div>
            <Field label="WhatsApp para recibir consultas" error={errors.whatsapp?.message}><input inputMode="numeric" autoComplete="tel-national" maxLength={10} className={inputClass} placeholder="10 dígitos" {...register('whatsapp')} /></Field>
            <p className="text-xs text-ink-500">El número se guarda en el apartado privado del anuncio y no se incluye en el documento público.</p>
          </section>

          <section className="space-y-4 rounded-2xl border border-ink-700/10 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-ink">Fotos del espacio</h2>
            <ImageUploader urls={photos} publicIds={photoPublicIds} onChange={(urls, ids) => { setPhotos(urls); setPhotoPublicIds(ids); }} maxImages={5} />
          </section>

          <label className="flex items-start gap-3 rounded-2xl border border-cream-300 bg-white p-4 text-sm text-ink-700"><input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" {...register('roommateAuthorizationConfirmed')} /><span>Confirmo que soy propietario o tengo autorización para ofrecer y compartir este espacio.</span></label>
          {errors.roommateAuthorizationConfirmed && <p className="text-sm text-red-700">{errors.roommateAuthorizationConfirmed.message}</p>}
          <label className="flex items-start gap-3 rounded-2xl border border-cream-300 bg-white p-4 text-sm text-ink-700"><input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" {...register('publicationConsentAccepted')} /><span>Confirmo que puedo publicar este contenido y que acepto mostrarlo en IxmiPlace. <Link to="/aviso-de-privacidad" target="_blank" className="font-semibold text-brand-800 underline">Aviso de privacidad</Link>.</span></label>
          {errors.publicationConsentAccepted && <p className="text-sm text-red-700">{errors.publicationConsentAccepted.message}</p>}
          {(submitError || Object.keys(errors).length > 0) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{submitError || 'Revisa los campos marcados y completa los datos requeridos.'}</div>}
          <button type="submit" disabled={isSubmitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-800 active:translate-y-0 disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{isSubmitting ? 'Enviando para revisión…' : 'Enviar búsqueda de roomie'}</button>
          <p className="flex items-start gap-2 text-xs text-ink-500"><Info className="mt-0.5 h-4 w-4 shrink-0" />La publicación se revisa antes de aparecer. IxmiPlace no valida identidad, compatibilidad ni acuerdos de convivencia.</p>
        </form>
      </div>
    </main>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <div><label className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>{children}{error && <p className="mt-1 text-xs text-red-700">{error}</p>}</div>;
}

function Toggle({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="flex min-h-12 items-center gap-3 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-sm text-ink-700"><input type="checkbox" className="h-4 w-4 accent-brand-600" {...props} /><span>{label}</span></label>;
}

function Utility({ label, field, costField, register, control, inputClass, errors }: { label: string; field: 'waterBilling' | 'electricityBilling' | 'internetBilling'; costField: 'waterMonthlyCost' | 'electricityMonthlyCost' | 'internetMonthlyCost'; register: ReturnType<typeof useForm<RoommateListingInput>>['register']; control: Control<RoommateListingInput>; inputClass: string; errors: ReturnType<typeof useForm<RoommateListingInput>>['formState']['errors'] }) {
  const billing = useWatch({ control, name: field });
  return <div className="space-y-2"><Field label={`${label}: cómo se paga`} error={errors[field]?.message}><select className={inputClass} {...register(field)}><option value="unknown">Por confirmar</option><option value="included">Incluido</option><option value="extra">Se paga aparte</option></select></Field>{billing === 'extra' && <Field label="Costo estimado mensual ($ MXN)" error={errors[costField]?.message}><input type="number" min="0" max="100000" className={inputClass} {...register(costField, { valueAsNumber: true })} /></Field>}</div>;
}
