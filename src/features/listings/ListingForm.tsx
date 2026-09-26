import { useForm, Controller } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useState } from 'react';
import {
  Loader2,
  AlertCircle,
  Home,
  DollarSign,
  MapPin,
  Info,
  Image as ImageIcon,
  Phone,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { listingSchema, type ListingInput } from '../../lib/zod-schemas';
import {
  CATEGORIES,
  OPERATIONS,
  AMENITIES,
  LODGING_AMENITIES,
  AVAILABILITY,
  priceUnitsFor,
} from '../../lib/constants';
import { ImageUploader } from './ImageUploader';
import { LocationPicker } from './LocationPicker';
import { useAuth } from '../auth/AuthContext';
import { PrivacyNoticeInline } from '../../components/legal/PrivacyNoticeInline';

interface ListingFormProps {
  defaultValues?: Partial<ListingInput> & { photos?: string[]; photoPublicIds?: string[] };
  onSubmit: (data: ListingInput, photos: string[], photoPublicIds: string[]) => Promise<void>;
  submitLabel?: string;
  lockFixedFields?: boolean;
  lockPrice?: boolean;
  onCategoryChange?: (category: ListingInput['category']) => void;
  immutableFieldsMessage?: string;
  requireConfirmation?: boolean;
  onConfirmSubmit?: (data: ListingInput, photos: string[], photoPublicIds: string[]) => void;
}

export function ListingForm({
  defaultValues,
  onSubmit,
  submitLabel = 'Publicar propiedad',
  lockFixedFields = false,
  lockPrice = lockFixedFields,
  onCategoryChange,
  immutableFieldsMessage,
  requireConfirmation = false,
  onConfirmSubmit,
}: ListingFormProps) {
  const { profile } = useAuth();
  const [photos, setPhotos] = useState<string[]>(defaultValues?.photos ?? []);
  const [photoPublicIds, setPhotoPublicIds] = useState<string[]>(defaultValues?.photoPublicIds ?? []);
  const [photosError, setPhotosError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ListingInput>({
    resolver: standardSchemaResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'casa',
      operation: 'renta',
      price: 0,
      priceUnit: 'mes',
      colonia: '',
      address: '',
      whatsapp: profile?.phone ?? '',
      bedrooms: 0,
      bathrooms: 0,
      parkingSpots: 0,
      areaM2: undefined,
      amenities: [],
      showPhone: true,
      availability: 'available',
      establishmentName: '',
      roomType: '',
      stayDurationHours: 3,
      checkInTime: '15:00',
      checkOutTime: '12:00',
      reception24h: false,
      foodAvailable: false,
      foodDescription: '',
      lat: 20.4833,
      lng: -99.2167,
      ...defaultValues,
    },
  });

  const operation = watch('operation');
  const category = watch('category');
  const priceUnit = watch('priceUnit');
  const foodAvailable = watch('foodAvailable');
  const isLodging = category === 'hotel' || category === 'motel';
  const isMotel = category === 'motel';
  const priceUnits = isMotel
    ? [
        { value: 'estancia' as const, label: 'por estancia' },
        { value: 'noche' as const, label: 'por noche' },
      ]
    : category === 'hotel'
      ? [{ value: 'noche' as const, label: 'por noche' }]
      : priceUnitsFor(operation);
  const categoryRegistration = register('category');
  const amenityOptions = isLodging ? LODGING_AMENITIES : AMENITIES;
  const availabilityOptions = isLodging
    ? AVAILABILITY.filter((item) => ['available', 'occupied', 'reserved', 'unavailable', 'unconfirmed'].includes(item.value))
    : AVAILABILITY.filter((item) => item.value !== 'occupied');

  async function handleFormSubmit(data: ListingInput) {
    setSubmitError('');
    setPhotosError('');

    if (photos.length === 0) {
      setPhotosError('Sube al menos 1 foto de la propiedad.');
      return;
    }

    if (requireConfirmation && onConfirmSubmit) {
      onConfirmSubmit(data, photos, photoPublicIds);
      return;
    }

    try {
      await onSubmit(data, photos, photoPublicIds);
    } catch (err) {
      console.error('Error guardando publicación:', err);
      setSubmitError('No se pudo guardar la publicación. Intenta de nuevo.');
    }
  }

  // ─────────── Estilos reutilizables ───────────
  const inputClass = `
    w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-3
    text-ink placeholder-ink-300
    transition-all duration-200
    focus:border-brand-500 focus:bg-white focus:outline-none
    focus:ring-4 focus:ring-brand-500/15
    ${lockFixedFields ? 'cursor-not-allowed opacity-70' : ''}
  `;

  const errorClass =
    'mt-2 flex items-center gap-1.5 text-xs text-red-600';

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <PrivacyNoticeInline kind="listing" />
      {lockFixedFields && immutableFieldsMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <p className="leading-relaxed">{immutableFieldsMessage}</p>
          </div>
        </div>
      )}

      {/* ═══════════ Información básica ═══════════ */}
      <Section
        icon={<Home className="h-5 w-5" />}
        title="Información básica"
        subtitle="Cuéntanos sobre tu propiedad"
      >
        <Field label="Título del anuncio" required error={errors.title?.message}>
          <input
            type="text"
            placeholder="Ej: Casa de 3 recámaras en el centro"
            {...register('title')}
            className={inputClass}
          />
        </Field>

        <Field label="Descripción" required error={errors.description?.message}>
          <textarea
            rows={5}
            placeholder="Describe la propiedad: estado, servicios cercanos, condiciones del contrato, etc."
            {...register('description')}
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Categoría" required error={errors.category?.message}>
            <select
              {...categoryRegistration}
              onChange={(event) => {
                categoryRegistration.onChange(event);
                const nextCategory = event.target.value;
                onCategoryChange?.(nextCategory as ListingInput['category']);
                if (nextCategory === 'hotel' || nextCategory === 'motel') {
                  setValue('operation', 'hospedaje', { shouldValidate: true });
                  setValue('priceUnit', nextCategory === 'motel' ? 'estancia' : 'noche', { shouldValidate: true });
                } else if (category === 'hotel' || category === 'motel') {
                  setValue('operation', 'renta', { shouldValidate: true });
                  setValue('priceUnit', 'mes', { shouldValidate: true });
                }
              }}
              className={inputClass}
              disabled={lockFixedFields}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Operación" required error={errors.operation?.message}>
            <select
              {...register('operation')}
              className={inputClass}
              disabled={lockFixedFields || isLodging}
            >
              {OPERATIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {isLodging && (
          <p className="rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm text-brand-800">
            Cada publicacion representa una habitacion o tipo de habitacion; su disponibilidad se administra por separado.
          </p>
        )}
      </Section>

      {/* ═══════════ Precio ═══════════ */}
      <Section
        icon={<DollarSign className="h-5 w-5" />}
        title="Precio"
        subtitle="Define el precio y su periodicidad"
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field
              label="Precio en pesos (MXN)"
              required
              error={errors.price?.message}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-medium text-secondary-500">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="5000"
                  {...register('price', { valueAsNumber: true })}
                  className={`${inputClass} pl-9`}
                  disabled={lockPrice}
                />
              </div>
            </Field>
          </div>

          <Field label="Unidad">
            <select
              {...register('priceUnit')}
              className={inputClass}
                   disabled={operation === 'venta' || category === 'hotel'}
            >
              {priceUnits.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {isMotel && priceUnit === 'estancia' && (
          <Field label="Duracion de estancia (horas)" required error={errors.stayDurationHours?.message}>
            <input
              type="number"
              min="1"
              max="24"
              {...register('stayDurationHours', { valueAsNumber: true })}
              className={inputClass}
            />
          </Field>
        )}
      </Section>

      {/* ═══════════ Ubicación ═══════════ */}
      <Section
        icon={<MapPin className="h-5 w-5" />}
        title="Ubicación"
        subtitle="¿Dónde se encuentra la propiedad?"
      >
        <Field label="Colonia o zona" required error={errors.colonia?.message}>
          <input
            type="text"
            placeholder="Ej: Centro, El Maye, San Juan"
            {...register('colonia')}
            className={inputClass}
            disabled={lockFixedFields}
          />
        </Field>

        <Field label="Dirección exacta (opcional)">
          <input
            type="text"
            placeholder="Calle, número, referencias"
            {...register('address')}
            className={inputClass}
          />
          <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-400">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            La dirección exacta no se muestra al público. Solo sirve para que tú
            la tengas registrada.
          </p>
        </Field>

        {/* 🆕 Mapa para marcar ubicación exacta */}
        <Field
          label="Ubicación en el mapa"
          required
          error={errors.lat?.message || errors.lng?.message}
        >
          <LocationPicker
            initialPosition={
              defaultValues?.lat != null && defaultValues?.lng != null
                ? { lat: defaultValues.lat, lng: defaultValues.lng }
                : undefined
            }
            onChange={(pos) => {
              if (lockFixedFields) return;
              setValue('lat', pos.lat, { shouldValidate: true });
              setValue('lng', pos.lng, { shouldValidate: true });
            }}
          />
        </Field>
      </Section>

      {/* ═══════════ Detalles ═══════════ */}
      <Section
        icon={<Home className="h-5 w-5" />}
        title="Detalles de la propiedad"
        subtitle="Características y amenidades"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Recámaras">
            <input
              type="number"
              min="0"
              {...register('bedrooms', { valueAsNumber: true })}
              className={inputClass}
            />
          </Field>
          <Field label="Baños">
            <input
              type="number"
              min="0"
              {...register('bathrooms', { valueAsNumber: true })}
              className={inputClass}
            />
          </Field>
          <Field label="Estacionamiento">
            <input
              type="number"
              min="0"
              {...register('parkingSpots', { valueAsNumber: true })}
              className={inputClass}
            />
          </Field>
          <Field label="m²">
            <input
              type="number"
              min="0"
              placeholder="100"
              {...register('areaM2', { valueAsNumber: true })}
              className={inputClass}
            />
          </Field>
        </div>

        {isLodging && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nombre del hotel o motel" required error={errors.establishmentName?.message}>
                <input type="text" placeholder="Ej: Hotel Ixmi" {...register('establishmentName')} className={inputClass} />
              </Field>
              <Field label="Tipo de habitacion" required error={errors.roomType?.message}>
                <input type="text" placeholder="Ej: Sencilla, Suite, Doble" {...register('roomType')} className={inputClass} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Hora de entrada" required error={errors.checkInTime?.message}>
                <input type="time" {...register('checkInTime')} className={inputClass} />
              </Field>
              <Field label="Hora de salida" required error={errors.checkOutTime?.message}>
                <input type="time" {...register('checkOutTime')} className={inputClass} />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm text-ink-700">
              <input type="checkbox" {...register('reception24h')} className="h-4 w-4 accent-brand-600" />
              Recepcion disponible las 24 horas
            </label>
            {isMotel && (
              <label className="flex items-center gap-3 text-sm text-ink-700">
                <input type="checkbox" {...register('foodAvailable')} className="h-4 w-4 accent-brand-600" />
                Ofrece comida o bebidas
              </label>
            )}
            {isMotel && foodAvailable && (
              <Field label="Comida y bebidas disponibles" required error={errors.foodDescription?.message}>
                <textarea rows={3} placeholder="Describe el menu, horarios o servicio a la habitacion" {...register('foodDescription')} className={`${inputClass} resize-none`} />
              </Field>
            )}
          </>
        )}

        <Field label="Amenidades disponibles">
          <Controller
            control={control}
            name="amenities"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {amenityOptions.map((a) => {
                  const selected = (field.value ?? []).includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        const current = (field.value ?? []) as string[];
                        const next = selected
                          ? current.filter((x) => x !== a)
                          : [...current, a];
                        field.onChange(next);
                      }}
                      className={`
                        flex items-center gap-1.5 rounded-full border px-4 py-2
                        text-sm font-medium transition-all duration-200
                        ${
                          selected
                            ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/30'
                            : 'border-cream-300 bg-white text-ink-500 hover:border-secondary-300 hover:bg-cream-100 hover:text-ink-700'
                        }
                      `}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      {a}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </Field>
      </Section>

      {/* ═══════════ Disponibilidad ═══════════ */}
      <Section
        icon={<Check className="h-5 w-5" />}
        title="Disponibilidad"
        subtitle="Mantén actualizado el estado real de tu propiedad"
      >
        <Field label="Estado de la propiedad">
          <select {...register('availability')} className={inputClass}>
            {availabilityOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      {/* ═══════════ Fotos ═══════════ */}
      <Section
        icon={<ImageIcon className="h-5 w-5" />}
        title="Fotos de la propiedad"
        subtitle="La primera imagen será la portada del anuncio"
      >
        <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
          <ImageUploader
            urls={photos}
            publicIds={photoPublicIds}
            onChange={(nextUrls, nextPublicIds) => {
              setPhotos(nextUrls);
              setPhotoPublicIds(nextPublicIds);
            }}
          />
        </div>
        {photosError && (
          <p className={`${errorClass} mt-2`}>
            <AlertCircle className="h-3.5 w-3.5" />
            {photosError}
          </p>
        )}
      </Section>

      {/* ═══════════ Contacto ═══════════ */}
      <Section
        icon={<Phone className="h-5 w-5" />}
        title="Contacto"
        subtitle="¿Cómo te contactan los interesados?"
      >
        <Field
          label="Número de WhatsApp"
          required
          error={errors.whatsapp?.message}
        >
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="7711234567"
            {...register('whatsapp')}
            className={inputClass}
            disabled={lockFixedFields}
          />
        </Field>
      </Section>

      {/* ═══════════ Error general ═══════════ */}
      {submitError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ═══════════ Botón enviar ═══════════ */}
      <div className="mt-8 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm">
        <button
          type="submit"
          disabled={isSubmitting}
          className="
            group relative flex w-full items-center justify-center gap-2
            overflow-hidden rounded-xl
            bg-gradient-to-r from-brand-500 to-brand-600
            py-4 font-semibold text-white
            shadow-xl shadow-brand-500/30
            transition-all duration-300
            hover:shadow-2xl hover:shadow-brand-500/50 hover:brightness-110
            disabled:cursor-not-allowed disabled:opacity-60
          "
        >
          <span
            className="
              pointer-events-none absolute inset-0 -translate-x-full
              bg-gradient-to-r from-transparent via-white/25 to-transparent
              group-hover:animate-[shimmer_1.2s_ease-in-out]
            "
          />
          <span className="relative flex items-center gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Publicando…
              </>
            ) : (
              submitLabel
            )}
          </span>
        </button>
        <p className="mt-3 text-center text-xs text-ink-400">
          Tu publicación será revisada antes de aparecer al público.
        </p>
      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </form>
  );
}

/* ══════════════════════════════════════════════════
   Componentes auxiliares
   ══════════════════════════════════════════════════ */

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function Section({ icon, title, subtitle, children }: SectionProps) {
  return (
    <section
      className="
        relative overflow-hidden rounded-2xl border border-cream-200
        bg-white p-6 shadow-sm
        transition-all duration-300
        hover:border-secondary-300 hover:shadow-md
      "
    >
      {/* Acento de color superior */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1
                   bg-gradient-to-r from-brand-500 via-accent-500 to-secondary-500"
        aria-hidden="true"
      />

      <header className="relative mb-5 flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center
                     rounded-xl bg-brand-50 text-brand-600
                     ring-1 ring-brand-500/20"
        >
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-ink-400">{subtitle}</p>}
        </div>
      </header>

      <div className="relative space-y-5">{children}</div>
    </section>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, error, children }: FieldProps) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-700">
        {label}
        {required && <span className="text-accent-600">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
