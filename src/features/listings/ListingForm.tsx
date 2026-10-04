import { useForm, Controller, type FieldErrors, type FieldPath } from 'react-hook-form';
import type { UseFormRegister } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
  Users,
  Baby,
  PawPrint,
  Cigarette,
  Landmark,
  Accessibility,
  CalendarDays,
  Droplets,
} from 'lucide-react';
import { listingSchema, type ListingInput } from '../../lib/zod-schemas';
import {
  CATEGORIES,
  OPERATIONS,
  AMENITIES,
  LODGING_AMENITIES,
  AVAILABILITY,
  LISTING_LIMITS,
  priceUnitsFor,
  supportsHouseRules,
} from '../../lib/constants';
import { ImageUploader } from './ImageUploader';
import { LocationPicker } from './LocationPicker';
import { useAuth } from '../auth/AuthContext';
import { PrivacyNoticeInline } from '../../components/legal/PrivacyNoticeInline';
import { HoneypotField } from '../../components/ui/HoneypotField';

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

/**
 * Convierte el valor de un <input type="number"> a number | undefined.
 * Con `valueAsNumber` un campo vacío da NaN y zod lo rechaza sin un mensaje claro.
 */
const optionalNumber = (v: unknown): number | undefined =>
  v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v);

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
  const [website, setWebsite] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    setFocus,
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
      nearbyPlaces: '',
      nearbyServices: [],
      nearbyServicesOther: '',
      safetyLevel: '',
      safetyDetails: '',
      waterIssueLevel: '',
      waterIssueDetails: '',
      transportAvailability: '',
      transportDestinations: '',
      maxGuests: undefined,
      childrenAllowed: true,
      petsAllowed: false,
      smokingAllowed: false,
      alcoholConsumptionAllowed: false,
      alcoholSalesAllowed: false,
      commercialActivityAllowed: false,
      commercialActivityNotes: '',
      shortStayUse: undefined,
      shortStayNotes: '',
      guarantorRequired: false,
      proofIncomeRequired: false,
      waterBilling: 'unknown',
      electricityBilling: 'unknown',
      internetBilling: 'unknown',
      stepFreeAccess: false,
      rampAccess: false,
      accessibleBathroom: false,
      elevatorAccess: false,
      roommateWanted: false,
      showPhone: true,
      publicationConsentAccepted: false,
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
  const safetyLevel = watch('safetyLevel');
  const waterIssueLevel = watch('waterIssueLevel');
  const commercialActivityAllowed = watch('commercialActivityAllowed');
  const isResidentialShortStay = operation === 'hospedaje' && ['casa', 'departamento', 'cuarto'].includes(category);
  const openHouseStartAt = watch('openHouseStartAt');
  const openHouseEndAt = watch('openHouseEndAt');
  const isLodging = category === 'hotel' || category === 'motel';
  const isMotel = category === 'motel';
  const showHouseRules = supportsHouseRules(category, operation);
  const showCommercialRules = operation !== 'venta' && (showHouseRules || category === 'local');
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

    if (website.trim()) return;

    if (requireConfirmation && data.publicationConsentAccepted !== true) {
      setSubmitError('Confirma que tienes autorización para publicar y que la información puede mostrarse públicamente.');
      return;
    }

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

  function handleInvalidSubmit(formErrors: FieldErrors<ListingInput>) {
    const entries = Object.entries(formErrors);
    const firstError = entries[0]?.[1];
    const message = firstError && 'message' in firstError && typeof firstError.message === 'string'
      ? firstError.message
      : '';
    setSubmitError(
      message
        ? `No se publicó. Revisa este campo: ${message}`
        : 'No se publicó. Revisa los campos obligatorios marcados en el formulario.'
    );

    const firstField = entries[0]?.[0];
    if (firstField) {
      requestAnimationFrame(() => setFocus(firstField as FieldPath<ListingInput>));
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
    <form onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)} className="space-y-6">
      <HoneypotField value={website} onChange={setWebsite} />
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

        {/* Mapa para marcar ubicación exacta */}
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
          <Field label="Recámaras" error={errors.bedrooms?.message}>
            <input
              type="number"
              min="0"
              {...register('bedrooms', { setValueAs: optionalNumber })}
              className={inputClass}
            />
          </Field>
          <Field label="Baños" error={errors.bathrooms?.message}>
            <input
              type="number"
              min="0"
              {...register('bathrooms', { setValueAs: optionalNumber })}
              className={inputClass}
            />
          </Field>
          <Field label="Estacionamiento" error={errors.parkingSpots?.message}>
            <input
              type="number"
              min="0"
              {...register('parkingSpots', { setValueAs: optionalNumber })}
              className={inputClass}
            />
          </Field>
          <Field label="m²" error={errors.areaM2?.message}>
            <input
              type="number"
              min="0"
              placeholder="100"
              {...register('areaM2', { setValueAs: optionalNumber })}
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

      {/* ═══════════ Entorno y servicios cercanos ═══════════ */}
      <Section
        icon={<Landmark className="h-5 w-5" />}
        title="Entorno y servicios cercanos"
        subtitle="Información opcional para que las personas sepan qué hay alrededor"
      >
        <Field label="Lugares notables cercanos" error={errors.nearbyPlaces?.message}>
          <textarea
            rows={2}
            maxLength={240}
            placeholder="Ej.: centro, mercado, parque o balnearios de la zona…"
            {...register('nearbyPlaces')}
            className={`${inputClass} resize-y`}
          />
          <p className="mt-1 text-xs text-ink-400">Menciona referencias públicas y evita incluir datos personales.</p>
        </Field>

        <Field label="¿Qué servicios o lugares quedan cerca?" error={errors.nearbyServices?.message}>
          <Controller
            control={control}
            name="nearbyServices"
            render={({ field }) => {
              const services = [
                ['hospital-clinic', 'Hospital o clínica'],
                ['schools', 'Escuela'],
                ['market', 'Mercado o supermercado'],
                ['public-transport', 'Transporte público'],
                ['shops', 'Tiendas y comercios'],
                ['parks', 'Parque o área recreativa'],
                ['university', 'Universidad'],
                ['downtown', 'Centro de la ciudad'],
                ['balnearios', 'Balnearios'],
                ['other', 'Otro'],
              ] as const;
              return (
                <div className="grid gap-2 sm:grid-cols-2">
                  {services.map(([value, label]) => (
                    <label key={value} className="flex min-h-11 items-center gap-3 rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm text-ink-700 transition-colors hover:border-brand-300">
                      <input
                        type="checkbox"
                        checked={(field.value ?? []).includes(value)}
                        onChange={(event) => {
                          const current = field.value ?? [];
                          field.onChange(event.target.checked
                            ? [...current, value]
                            : current.filter((item) => item !== value));
                        }}
                        className="h-4 w-4 accent-brand-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              );
            }}
          />
        </Field>
        {(watch('nearbyServices') ?? []).includes('other') && (
          <Field label="Otros lugares cercanos" error={errors.nearbyServicesOther?.message}>
            <input type="text" maxLength={120} placeholder="Describe otros lugares útiles" {...register('nearbyServicesOther')} className={inputClass} />
          </Field>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Percepción de seguridad de la zona" error={errors.safetyLevel?.message}>
            <select {...register('safetyLevel')} className={inputClass}>
              <option value="">Prefiero no indicarlo</option>
              <option value="quiet">Me parece tranquila</option>
              <option value="mixed">La seguridad es variable</option>
              <option value="caution">Conviene tomar precauciones</option>
              <option value="unknown">No tengo información</option>
              <option value="other">Otra percepción</option>
            </select>
            <p className="mt-1 text-xs text-ink-400">Es una referencia declarada por quien publica; IxmiPlace no verifica ni garantiza la seguridad de la zona.</p>
          </Field>
          <Field label="Disponibilidad de agua" error={errors.waterIssueLevel?.message}>
            <select {...register('waterIssueLevel')} className={inputClass}>
              <option value="">Sin información</option>
              <option value="none">Sin problemas habituales reportados</option>
              <option value="occasional">Problemas ocasionales</option>
              <option value="frequent">Problemas frecuentes</option>
              <option value="severe">Problemas graves o suministro muy irregular</option>
              <option value="unknown">No lo sé</option>
              <option value="other">Otra situación</option>
            </select>
          </Field>
        </div>

        {(safetyLevel === 'other' || safetyLevel === 'mixed' || safetyLevel === 'caution') && (
          <Field label="Detalle sobre seguridad (opcional)" error={errors.safetyDetails?.message}>
            <textarea rows={2} maxLength={240} placeholder="Comparte una referencia general y objetiva, sin datos personales" {...register('safetyDetails')} className={`${inputClass} resize-y`} />
          </Field>
        )}
        {(waterIssueLevel === 'occasional' || waterIssueLevel === 'frequent' || waterIssueLevel === 'severe' || waterIssueLevel === 'other') && (
          <Field label="¿Con qué frecuencia o cómo afecta el servicio?" error={errors.waterIssueDetails?.message}>
            <textarea rows={2} maxLength={240} placeholder="Ej.: cortes algunas tardes, baja presión en temporada seca…" {...register('waterIssueDetails')} className={`${inputClass} resize-y`} />
          </Field>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Transporte público cercano" error={errors.transportAvailability?.message}>
            <select {...register('transportAvailability')} className={inputClass}>
              <option value="">Sin información</option>
              <option value="nearby">Sí, hay transporte cerca</option>
              <option value="limited">Hay, pero con servicio limitado</option>
              <option value="none">No hay transporte cercano</option>
              <option value="unknown">No lo sé</option>
            </select>
          </Field>
          <Field label="Rutas o destinos" error={errors.transportDestinations?.message}>
            <input type="text" maxLength={200} placeholder="Ej.: centro, mercado, comunidades cercanas" {...register('transportDestinations')} className={inputClass} />
          </Field>
        </div>
      </Section>

      {/* ═══════════ Reglas de la casa ═══════════ */}
      {showCommercialRules && (
        <Section
          icon={<Users className="h-5 w-5" />}
          title={isLodging ? 'Ocupación y políticas' : category === 'local' ? 'Reglas del local' : 'Reglas de la casa'}
          subtitle="Ayuda a los interesados a saber si es para ellos"
        >
          {showHouseRules && <>
            <Field
              label={isLodging ? 'Capacidad máxima por habitación' : 'Número máximo de personas'}
              error={errors.maxGuests?.message}
            >
              <input
                type="number"
                min="1"
                max={LISTING_LIMITS.maxGuestsMax}
                placeholder="4"
                {...register('maxGuests', { setValueAs: optionalNumber })}
                className={inputClass}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <RuleToggle icon={<Baby className="h-4 w-4" />} label="Se aceptan niños" {...register('childrenAllowed')} />
              <RuleToggle icon={<PawPrint className="h-4 w-4" />} label="Pet friendly" {...register('petsAllowed')} />
              <RuleToggle icon={<Cigarette className="h-4 w-4" />} label="Se permite fumar" {...register('smokingAllowed')} />
            </div>
          </>}

          <div className="grid gap-3 sm:grid-cols-2">
            <RuleToggle label="Se permite consumir bebidas alcohólicas" {...register('alcoholConsumptionAllowed')} />
            <RuleToggle label="Se permite vender bebidas alcohólicas" {...register('alcoholSalesAllowed')} />
            <RuleToggle label="Se permite vender comida u otros productos desde el inmueble" {...register('commercialActivityAllowed')} />
          </div>
          {commercialActivityAllowed && <Field label="Condiciones para la actividad de venta (opcional)"><textarea rows={2} maxLength={240} {...register('commercialActivityNotes')} className={`${inputClass} resize-y`} placeholder="Ej.: solo comida empacada, horario limitado; no incluyas datos personales" /></Field>}
          <p className="text-xs text-ink-400">Son condiciones declaradas por quien publica; las actividades deben cumplir las reglas y permisos aplicables.</p>

          {isResidentialShortStay && <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
            <p className="text-sm font-semibold text-brand-900">Renta temporal por noche</p>
            <Field label="Uso previsto"><select {...register('shortStayUse')} className={inputClass}><option value="">Elige una opción</option><option value="vacation">Vacaciones o descanso</option><option value="events">Reuniones o eventos</option><option value="both">Vacaciones y eventos</option><option value="other">Otro uso permitido</option></select></Field>
            <Field label="Condiciones de estancia (opcional)"><textarea rows={2} maxLength={240} {...register('shortStayNotes')} className={`${inputClass} resize-y`} placeholder="Ej.: horario de silencio, limpieza, número máximo de visitantes" /></Field>
            <p className="text-xs text-brand-800">El precio puede expresarse por día o por noche. Confirma con quien publica si el evento o reunión está permitido y qué servicios incluye.</p>
          </div>}
        </Section>
      )}

      {/* ═══════════ Condiciones, servicios y accesibilidad ═══════════ */}
      {(operation === 'renta' || operation === 'hospedaje') && (
        <Section icon={<Droplets className="h-5 w-5" />} title={operation === 'hospedaje' ? 'Condiciones de estancia' : 'Costos y requisitos'} subtitle={operation === 'hospedaje' ? 'Define condiciones para noches, vacaciones o eventos' : 'Aclara qué incluye la renta y qué necesita el interesado'}>
          {operation === 'renta' && <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Depósito (meses)"><input type="number" min="0" max="12" {...register('securityDepositMonths', { setValueAs: optionalNumber })} className={inputClass} /></Field>
            <Field label="Plazo mínimo (meses)"><input type="number" min="1" max="120" {...register('minimumLeaseMonths', { setValueAs: optionalNumber })} className={inputClass} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <RuleToggle label="Se requiere aval" {...register('guarantorRequired')} />
            <RuleToggle label="Se comprueban ingresos" {...register('proofIncomeRequired')} />
          </div>
          <Field label="Otros requisitos"><textarea rows={2} maxLength={300} {...register('rentalRequirementsNotes')} className={`${inputClass} resize-y`} placeholder="Ej.: identificación y referencias" /></Field>
          </>}
          {operation === 'renta' && <>
          <div className="grid gap-4 sm:grid-cols-3">
            <UtilityField label="Agua" billingName="waterBilling" costName="waterMonthlyCost" register={register} inputClass={inputClass} optionalNumber={optionalNumber} />
            <UtilityField label="Luz" billingName="electricityBilling" costName="electricityMonthlyCost" register={register} inputClass={inputClass} optionalNumber={optionalNumber} />
            <UtilityField label="Internet" billingName="internetBilling" costName="internetMonthlyCost" register={register} inputClass={inputClass} optionalNumber={optionalNumber} />
          </div>
          <p className="text-xs text-ink-400">Los montos son estimados declarados por quien publica; confirma el importe y la forma de cobro directamente.</p>
          </>}
        </Section>
      )}

      <Section icon={<Accessibility className="h-5 w-5" />} title="Accesibilidad" subtitle="Marca solo las características que realmente existen">
        <div className="grid gap-3 sm:grid-cols-2">
          <RuleToggle label="Acceso sin escalones" {...register('stepFreeAccess')} />
          <RuleToggle label="Cuenta con rampa" {...register('rampAccess')} />
          <RuleToggle label="Baño accesible" {...register('accessibleBathroom')} />
          <RuleToggle label="Elevador" {...register('elevatorAccess')} />
        </div>
      </Section>

      {/* ═══════════ Visitas, roomies e inspección ═══════════ */}
      <Section icon={<CalendarDays className="h-5 w-5" />} title="Visitas" subtitle="Coordina una cita o una jornada de puertas abiertas">
        <Field label="Horarios habituales para visitar"><input maxLength={160} {...register('visitAvailability')} className={inputClass} placeholder="Ej.: lunes a sábado, de 10:00 a 17:00; con cita" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Casa abierta: inicio"><input type="datetime-local" value={toLocalDateTime(openHouseStartAt)} onChange={(e) => setValue('openHouseStartAt', e.target.value ? new Date(e.target.value).getTime() : undefined, { shouldValidate: true })} className={inputClass} /></Field>
          <Field label="Casa abierta: término" error={errors.openHouseEndAt?.message}><input type="datetime-local" value={toLocalDateTime(openHouseEndAt)} onChange={(e) => setValue('openHouseEndAt', e.target.value ? new Date(e.target.value).getTime() : undefined, { shouldValidate: true })} className={inputClass} /></Field>
        </div>
        {openHouseStartAt && openHouseEndAt && <Field label="Aforo aproximado"><input type="number" min="1" max="500" {...register('openHouseCapacity', { setValueAs: optionalNumber })} className={inputClass} /></Field>}
        <Field label="Indicaciones de la visita"><input maxLength={240} {...register('openHouseNotes')} className={inputClass} placeholder="Ej.: confirmar asistencia; punto de encuentro" /></Field>
        <p className="text-xs text-ink-400">Enviar una solicitud no reserva una visita ni un lugar; el propietario debe confirmarla.</p>
        {operation === 'renta' && (category === 'cuarto' || category === 'departamento' || category === 'casa') && (
          <Link to="/publicar-roomie" className="block rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm font-semibold text-brand-900 transition hover:border-brand-400 hover:bg-brand-100">
            ¿Quieres compartir tu espacio? Publica una búsqueda de roomie en su formulario separado →
          </Link>
        )}
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

      {/* ═══════════ Consentimiento ═══════════ */}
      {requireConfirmation && (
        <label className="flex items-start gap-3 rounded-2xl border border-cream-200 bg-white p-4 text-sm leading-relaxed text-ink-600 shadow-sm">
          <input
            type="checkbox"
            {...register('publicationConsentAccepted')}
            className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
          />
          <span>
            Confirmo que tengo autorización para ofrecer esta propiedad y que los datos y fotos son correctos y puedo publicarlos. Entiendo que el anuncio aprobado será público y que IxmiPlace no verifica la propiedad, sus permisos, condiciones ni disponibilidad. Acepto los <Link to="/terminos" target="_blank" className="font-semibold text-brand-700 underline">Términos</Link> y la publicación conforme al <Link to="/aviso-de-privacidad" target="_blank" className="font-semibold text-brand-700 underline">Aviso de Privacidad</Link>.
          </span>
        </label>
      )}

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
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
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

function toLocalDateTime(value?: number) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function UtilityField({
  label, billingName, costName, register, inputClass, optionalNumber,
}: {
  label: string;
  billingName: 'waterBilling' | 'electricityBilling' | 'internetBilling';
  costName: 'waterMonthlyCost' | 'electricityMonthlyCost' | 'internetMonthlyCost';
  register: UseFormRegister<ListingInput>;
  inputClass: string;
  optionalNumber: (value: unknown) => number | undefined;
}) {
  const billing = register(billingName);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-ink-700">{label}</label>
      <select {...billing} className={inputClass}>
        <option value="unknown">Sin información</option>
        <option value="included">Incluido</option>
        <option value="extra">Se paga aparte</option>
      </select>
      <input type="number" min="0" max="100000" placeholder="Costo mensual estimado (MXN)" {...register(costName, { setValueAs: optionalNumber })} className={inputClass} />
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
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

interface RuleToggleProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  label: string;
}

/**
 * Checkbox con aspecto de "chip". Usa forwardRef para que
 * `{...register('campo')}` (que incluye `ref`) funcione directamente.
 * `has-[:checked]` requiere Tailwind >= 3.4.
 */
const RuleToggle = forwardRef<HTMLInputElement, RuleToggleProps>(
  ({ icon, label, ...props }, ref) => (
    <label
      className="flex cursor-pointer items-center gap-3 rounded-xl border border-cream-300
                 bg-cream-50 px-4 py-3 text-sm font-medium text-ink-700 transition
                 hover:bg-cream-100 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
    >
      <input
        type="checkbox"
        ref={ref}
        {...props}
        className="h-4 w-4 accent-brand-600"
      />
      {icon && <span className="text-brand-600">{icon}</span>}
      {label}
    </label>
  )
);
RuleToggle.displayName = 'RuleToggle';
