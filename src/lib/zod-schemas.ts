import { z } from 'zod';
import { LISTING_LIMITS } from './constants';

const stripUnsafeControls = (value: string) => value
  .normalize('NFC')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
const plainText = (min: number, max: number) => z.string()
  .trim()
  .transform(stripUnsafeControls)
  .pipe(z.string().min(min).max(max).refine((value) => !/<\s*\/?\s*[a-z][^>]*>/i.test(value)));

export const displayNameSchema = z.string()
  .trim()
  .transform(stripUnsafeControls)
  .pipe(z.string().min(2).max(60).refine((value) => !/[<>]/.test(value)));

// ============================================================
// Crear/editar una publicación
// ============================================================

export const listingSchema = z
  .object({
    title: plainText(LISTING_LIMITS.titleMin, LISTING_LIMITS.titleMax),

    description: plainText(LISTING_LIMITS.descriptionMin, LISTING_LIMITS.descriptionMax),

    category: z.enum([
      'casa',
      'departamento',
      'cuarto',
      'terreno',
      'local',
      'hotel',
      'motel',
    ]),

    operation: z.enum(['renta', 'venta', 'hospedaje']),

    price: z
      .number({ error: 'El precio debe ser un número' })
      .positive('El precio debe ser mayor a 0')
      .max(LISTING_LIMITS.priceMax, 'Precio demasiado alto'),

    priceUnit: z.enum(['mes', 'noche', 'total', 'estancia']).optional(),

    establishmentName: plainText(0, 100).optional().or(z.literal('')),
    roomType: plainText(0, 80).optional().or(z.literal('')),
    stayDurationHours: z.number().int().min(1).max(24).optional(),
    checkInTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal('')),
    checkOutTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().or(z.literal('')),
    reception24h: z.boolean().optional(),
    foodAvailable: z.boolean().optional(),
    foodDescription: plainText(0, 300).optional().or(z.literal('')),

    colonia: plainText(2, 80),

    address: plainText(0, 200).optional().or(z.literal('')),

    // Ubicación en el mapa (requerida)
    lat: z
      .number({ error: 'Marca la ubicación en el mapa' })
      .min(-90, 'Latitud inválida')
      .max(90, 'Latitud inválida'),
    lng: z
      .number({ error: 'Marca la ubicación en el mapa' })
      .min(-180, 'Longitud inválida')
      .max(180, 'Longitud inválida'),

    whatsapp: z
      .string()
      .regex(/^\d{10}$/, 'Debe ser un número de 10 dígitos (sin espacios)'),

    bedrooms: z.number().int().min(0).max(50).optional(),
    bathrooms: z.number().int().min(0).max(50).optional(),
    parkingSpots: z.number().int().min(0).max(50).optional(),
    areaM2: z.number().positive().max(100_000).optional(),

    amenities: z.array(plainText(1, 40)).max(30).optional(),

    // Reglas de la casa (solo aplican a rentas y hospedaje)
    maxGuests: z
      .number({ error: 'Indica un número de personas' })
      .int('Debe ser un número entero')
      .min(1, 'Mínimo 1 persona')
      .max(LISTING_LIMITS.maxGuestsMax, `Máximo ${LISTING_LIMITS.maxGuestsMax} personas`)
      .optional(),
    childrenAllowed: z.boolean().optional(),
    petsAllowed: z.boolean().optional(),
    smokingAllowed: z.boolean().optional(),

    showPhone: z.boolean().default(true),

    availability: z
      .enum(['available', 'occupied', 'reserved', 'rented', 'sold', 'unavailable', 'unconfirmed'])
      .optional(),

    // Confirmación de autorización para publicar.
    // Se exige a nivel de UI (ListingForm con requireConfirmation) y de
    // handleSubmit; aquí solo se tipa para no romper el formulario de edición.
    publicationConsentAccepted: z.boolean(),
  }).strict()
  // Validación condicional: unidad de precio coherente con la operación
  .refine(
    (data) => {
      if (data.operation === 'venta') {
        return data.priceUnit === undefined || data.priceUnit === 'total';
      }
      return true;
    },
    {
      message: 'Para venta, la unidad de precio debe ser "total" o vacía',
      path: ['priceUnit'],
    }
  )
  .refine(
    (data) => {
      if (data.category !== 'hotel' && data.category !== 'motel') return true;
      if (data.operation !== 'hospedaje') return false;
      if (!data.establishmentName || data.establishmentName.length < 2) return false;
      if (!data.roomType || data.roomType.length < 2) return false;
      if (!data.checkInTime || !data.checkOutTime) return false;
      if (data.category === 'hotel' && data.priceUnit !== 'noche') return false;
      if (data.category === 'motel' && !['estancia', 'noche'].includes(data.priceUnit ?? '')) return false;
      if (data.category === 'motel' && data.priceUnit === 'estancia' && !data.stayDurationHours) return false;
      if (data.foodAvailable && (!data.foodDescription || data.foodDescription.length < 3)) return false;
      return true;
    },
    {
      message: 'Completa los datos de hospedaje, habitación, horario y precio.',
      path: ['roomType'],
    }
  );

export type ListingInput = z.infer<typeof listingSchema>;

// ============================================================
// Reporte
// ============================================================

export const reportSchema = z.object({
  reason: z.enum(['spam', 'fraude', 'no_existe', 'duplicado', 'otro']),
  comment: plainText(0, 500).optional().or(z.literal('')),
}).strict();

export type ReportInput = z.infer<typeof reportSchema>;

export const internalMessageSchema = z.object({
  subject: plainText(3, 100),
  message: plainText(10, 1000),
}).strict();

export type InternalMessageInput = z.infer<typeof internalMessageSchema>;
