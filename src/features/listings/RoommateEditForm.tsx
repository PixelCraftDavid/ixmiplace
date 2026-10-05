import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useForm, useWatch, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { ArrowLeft, BedDouble, Check, Info, Loader2, MapPin, Users } from 'lucide-react';
import { LISTING_LIMITS } from '../../lib/constants';
import { roommateListingSchema, type RoommateListingInput } from '../../lib/zod-schemas';
import type { Listing } from '../../types/models';
import { ImageUploader } from './ImageUploader';

const inputClass = 'w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3 text-ink placeholder-ink-300 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/15';

interface RoommateEditFormProps {
  listing: Listing;
  onSubmit: (data: RoommateListingInput, photos: string[], photoPublicIds: string[]) => Promise<void>;
}

export function RoommateEditForm({ listing, onSubmit }: RoommateEditFormProps) {
  const [photos, setPhotos] = useState(listing.photos ?? []);
  const [photoPublicIds, setPhotoPublicIds] = useState(listing.photoPublicIds ?? []);
  const [submitError, setSubmitError] = useState('');
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<RoommateListingInput>({
    resolver: standardSchemaResolver(roommateListingSchema),
    defaultValues: {
      title: listing.title,
      description: listing.description,
      price: listing.price,
      colonia: listing.colonia,
      whatsapp: listing.whatsapp ?? '',
      currentOccupants: listing.currentOccupants ?? 1,
      roommatesWantedCount: listing.roommatesWantedCount ?? 1,
      roommatePrivateRoom: listing.roommatePrivateRoom ?? false,
      roommateFurnished: listing.roommateFurnished ?? false,
      roommateSharedBathroom: listing.roommateSharedBathroom ?? false,
      roommateSharedKitchen: listing.roommateSharedKitchen ?? false,
      // La autorización ya se confirmó al publicar. No se vuelve a pedir al editar.
      roommateAuthorizationConfirmed: true,
      petsAllowed: listing.petsAllowed ?? false,
      smokingAllowed: listing.smokingAllowed ?? false,
      alcoholConsumptionAllowed: listing.alcoholConsumptionAllowed ?? false,
      alcoholSalesAllowed: listing.alcoholSalesAllowed ?? false,
      commercialActivityAllowed: listing.commercialActivityAllowed ?? false,
      commercialActivityNotes: listing.commercialActivityNotes ?? '',
      roommatePreferences: listing.roommatePreferences ?? '',
      waterBilling: listing.waterBilling ?? 'unknown',
      waterMonthlyCost: listing.waterMonthlyCost,
      electricityBilling: listing.electricityBilling ?? 'unknown',
      electricityMonthlyCost: listing.electricityMonthlyCost,
      internetBilling: listing.internetBilling ?? 'unknown',
      internetMonthlyCost: listing.internetMonthlyCost,
      publicationConsentAccepted: true,
    },
  });

  const commercialActivityAllowed = useWatch({ control, name: 'commercialActivityAllowed' });

  async function submit(data: RoommateListingInput) {
    setSubmitError('');
    if (photos.length < LISTING_LIMITS.photosMin) {
      setSubmitError('Deja al menos una foto del espacio.');
      return;
    }
    try {
      await onSubmit(data, photos, photoPublicIds);
    } catch (error) {
      console.error('No se pudo actualizar la búsqueda de roomie:', error);
      setSubmitError(error instanceof Error ? error.message : 'No se pudieron guardar los cambios. Intenta de nuevo.');
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <Link to="/mis-publicaciones" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-800 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Volver a mis publicaciones
      </Link>
      <header>
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800"><Users className="h-3.5 w-3.5" /> Búsqueda de roomie</span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Editar búsqueda de roomie</h1>
        <p className="mt-2 max-w-2xl text-ink-500">Aquí solo aparecen los datos de convivencia y del espacio compartido.</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-ink-700/10 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><BedDouble className="h-5 w-5 text-brand-700" /> El espacio compartido</h2>
        <Field label="Título" error={errors.title?.message}><input maxLength={80} className={inputClass} {...register('title')} /></Field>
        <Field label="Descripción" error={errors.description?.message}><textarea rows={4} maxLength={1500} className={`${inputClass} resize-y`} {...register('description')} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Aportación mensual (MXN)"><input className={`${inputClass} opacity-70`} value={listing.price} disabled readOnly /><small className="mt-1 block text-xs text-ink-500">Este dato queda fijo después de publicar.</small></Field>
          <Field label="Personas que ya viven ahí" error={errors.currentOccupants?.message}><input type="number" min="1" max="30" className={inputClass} {...register('currentOccupants', { valueAsNumber: true })} /></Field>
          <Field label="Roomies que buscas" error={errors.roommatesWantedCount?.message}><input type="number" min="1" max="10" className={inputClass} {...register('roommatesWantedCount', { valueAsNumber: true })} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Cuarto privado" {...register('roommatePrivateRoom')} />
          <Toggle label="Amueblado" {...register('roommateFurnished')} />
          <Toggle label="Baño compartido" {...register('roommateSharedBathroom')} />
          <Toggle label="Cocina compartida" {...register('roommateSharedKitchen')} />
        </div>
        <Field label="Colonia o zona aproximada"><input className={`${inputClass} opacity-70`} value={listing.colonia} disabled readOnly /><small className="mt-1 block text-xs text-ink-500">La zona queda fija después de publicar.</small></Field>
        <p className="flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs text-brand-900"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />Por privacidad, la ubicación precisa no se publica.</p>
      </section>

      <section className="space-y-4 rounded-2xl border border-ink-700/10 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold text-ink">Convivencia y reglas de la casa</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Se permiten mascotas" {...register('petsAllowed')} />
          <Toggle label="Se permite fumar" {...register('smokingAllowed')} />
          <Toggle label="Se permite consumir bebidas alcohólicas" {...register('alcoholConsumptionAllowed')} />
          <Toggle label="Se permite vender bebidas alcohólicas" {...register('alcoholSalesAllowed')} />
          <Toggle label="Se permite vender comida u otros productos" {...register('commercialActivityAllowed')} />
        </div>
        {commercialActivityAllowed && <Field label="Condiciones para vender (opcional)" error={errors.commercialActivityNotes?.message}><textarea rows={2} maxLength={240} className={inputClass} {...register('commercialActivityNotes')} /></Field>}
        <Field label="Preferencias de convivencia (opcional)" error={errors.roommatePreferences?.message}><textarea rows={3} maxLength={300} className={inputClass} {...register('roommatePreferences')} /></Field>
      </section>

      <section className="space-y-4 rounded-2xl border border-ink-700/10 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold text-ink">Gastos de servicios</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Utility label="Agua" field="waterBilling" costField="waterMonthlyCost" control={control} register={register} errors={errors} />
          <Utility label="Luz" field="electricityBilling" costField="electricityMonthlyCost" control={control} register={register} errors={errors} />
          <Utility label="Internet" field="internetBilling" costField="internetMonthlyCost" control={control} register={register} errors={errors} />
        </div>
        <Field label="WhatsApp de contacto"><input className={`${inputClass} opacity-70`} value={listing.whatsapp ?? 'No disponible'} disabled readOnly /><small className="mt-1 block text-xs text-ink-500">El contacto permanece privado y no se modifica desde esta pantalla.</small></Field>
      </section>

      <section className="space-y-4 rounded-2xl border border-ink-700/10 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-bold text-ink">Fotos del espacio</h2>
        <ImageUploader urls={photos} publicIds={photoPublicIds} onChange={(urls, ids) => { setPhotos(urls); setPhotoPublicIds(ids); }} maxImages={5} />
      </section>

      {(submitError || Object.keys(errors).length > 0) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{submitError || 'Revisa los campos marcados y completa los datos requeridos.'}</div>}
      <button type="submit" disabled={isSubmitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{isSubmitting ? 'Guardando cambios…' : 'Guardar cambios'}</button>
      <p className="flex items-start gap-2 text-xs text-ink-500"><Info className="mt-0.5 h-4 w-4 shrink-0" />Los cambios se guardan en esta búsqueda de roomie. La disponibilidad se conserva.</p>
    </form>
  );
}

type BillingField = 'waterBilling' | 'electricityBilling' | 'internetBilling';
type CostField = 'waterMonthlyCost' | 'electricityMonthlyCost' | 'internetMonthlyCost';

function Utility({ label, field, costField, control, register, errors }: {
  label: string;
  field: BillingField;
  costField: CostField;
  control: Control<RoommateListingInput>;
  register: UseFormRegister<RoommateListingInput>;
  errors: FieldErrors<RoommateListingInput>;
}) {
  const billing = useWatch({ control, name: field });
  return <div className="space-y-2"><Field label={label} error={errors[field]?.message as string | undefined}><select className={inputClass} {...register(field)}><option value="unknown">No especificado</option><option value="included">Incluido</option><option value="extra">Se paga aparte</option></select></Field>{billing === 'extra' && <Field label="Costo mensual aproximado" error={errors[costField]?.message as string | undefined}><input type="number" min="0" max="100000" className={inputClass} {...register(costField, { valueAsNumber: true })} /></Field>}</div>;
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <div><label className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>{children}{error && <p className="mt-1 text-xs text-red-700">{error}</p>}</div>;
}

function Toggle({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="flex min-h-12 items-center gap-3 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-sm text-ink-700"><input type="checkbox" className="h-4 w-4 accent-brand-600" {...props} /><span>{label}</span></label>;
}
