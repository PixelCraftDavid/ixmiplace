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

    priceUnit: z.enum(['mes', 'dia', 'noche', 'total', 'estancia']).optional(),

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

    // Entorno y servicios cercanos. Todos son opcionales para anuncios existentes.
    nearbyPlaces: plainText(0, 240).optional().or(z.literal('')),
    nearbyServices: z.array(z.enum([
      'hospital-clinic', 'schools', 'market', 'public-transport', 'shops',
      'parks', 'university', 'downtown', 'balnearios', 'other',
    ])).max(10).optional(),
    nearbyServicesOther: plainText(0, 120).optional().or(z.literal('')),
    safetyLevel: z.enum(['quiet', 'mixed', 'caution', 'unknown', 'other']).optional().or(z.literal('')),
    safetyDetails: plainText(0, 240).optional().or(z.literal('')),
    waterIssueLevel: z.enum(['none', 'occasional', 'frequent', 'severe', 'unknown', 'other']).optional().or(z.literal('')),
    waterIssueDetails: plainText(0, 240).optional().or(z.literal('')),
    transportAvailability: z.enum(['nearby', 'limited', 'none', 'unknown']).optional().or(z.literal('')),
    transportDestinations: plainText(0, 200).optional().or(z.literal('')),

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
    alcoholConsumptionAllowed: z.boolean().optional(),
    alcoholSalesAllowed: z.boolean().optional(),
    commercialActivityAllowed: z.boolean().optional(),
    commercialActivityNotes: plainText(0, 240).optional().or(z.literal('')),
    shortStayUse: z.enum(['vacation', 'events', 'both', 'other']).optional().or(z.literal('')),
    shortStayNotes: plainText(0, 240).optional().or(z.literal('')),

    securityDepositMonths: z.number().int().min(0).max(12).optional(),
    guarantorRequired: z.boolean().optional(),
    proofIncomeRequired: z.boolean().optional(),
    minimumLeaseMonths: z.number().int().min(1).max(120).optional(),
    rentalRequirementsNotes: plainText(0, 300).optional().or(z.literal('')),
    waterBilling: z.enum(['included', 'extra', 'unknown']).optional(),
    waterMonthlyCost: z.number().min(0).max(100000).optional(),
    electricityBilling: z.enum(['included', 'extra', 'unknown']).optional(),
    electricityMonthlyCost: z.number().min(0).max(100000).optional(),
    internetBilling: z.enum(['included', 'extra', 'unknown']).optional(),
    internetMonthlyCost: z.number().min(0).max(100000).optional(),

    stepFreeAccess: z.boolean().optional(),
    rampAccess: z.boolean().optional(),
    accessibleBathroom: z.boolean().optional(),
    elevatorAccess: z.boolean().optional(),

    visitAvailability: plainText(0, 160).optional().or(z.literal('')),
    openHouseStartAt: z.number().int().positive().optional(),
    openHouseEndAt: z.number().int().positive().optional(),
    openHouseCapacity: z.number().int().min(1).max(500).optional(),
    openHouseNotes: plainText(0, 240).optional().or(z.literal('')),

    roommateWanted: z.boolean().optional(),
    roommatePreferences: plainText(0, 300).optional().or(z.literal('')),
    roommatesWantedCount: z.number().int().min(1).max(10).optional(),
    currentOccupants: z.number().int().min(1).max(30).optional(),
    roommatePrivateRoom: z.boolean().optional(),
    roommateFurnished: z.boolean().optional(),
    roommateSharedBathroom: z.boolean().optional(),
    roommateSharedKitchen: z.boolean().optional(),

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
  )
  .refine((data) => data.roommateWanted !== true || (data.operation === 'renta' && ['casa', 'departamento', 'cuarto'].includes(data.category)), {
    message: 'La búsqueda de roomie solo aplica a cuartos, departamentos o casas en renta.',
    path: ['roommateWanted'],
  })
  .refine((data) => (data.openHouseStartAt === undefined) === (data.openHouseEndAt === undefined), {
    message: 'Indica fecha y hora de inicio y término de la casa abierta.',
    path: ['openHouseEndAt'],
  })
  .refine((data) => data.openHouseStartAt === undefined || data.openHouseEndAt! > data.openHouseStartAt, {
    message: 'La hora de término debe ser posterior al inicio.',
    path: ['openHouseEndAt'],
  })
  .refine((data) => data.openHouseStartAt === undefined || data.openHouseStartAt > Date.now(), {
    message: 'La casa abierta debe programarse en una fecha futura.',
    path: ['openHouseStartAt'],
  })
  .refine((data) => (data.waterBilling !== 'extra' || data.waterMonthlyCost !== undefined)
    && (data.electricityBilling !== 'extra' || data.electricityMonthlyCost !== undefined)
    && (data.internetBilling !== 'extra' || data.internetMonthlyCost !== undefined), {
    message: 'Indica el costo estimado mensual de cada servicio que se paga aparte.',
    path: ['waterMonthlyCost'],
  });

export type ListingInput = z.infer<typeof listingSchema>;

// Formulario separado para buscar roomie. Se convierte en un anuncio estándar
// de cuarto en renta para conservar moderación, lectura y reportes actuales.
export const roommateListingSchema = z.object({
  title: plainText(8, 80),
  description: plainText(30, 1500),
  price: z.number().positive().max(LISTING_LIMITS.priceMax),
  colonia: plainText(2, 80),
  whatsapp: z.string().regex(/^\d{10}$/, 'Debe ser un número de 10 dígitos (sin espacios)'),
  currentOccupants: z.number().int().min(1).max(30),
  roommatesWantedCount: z.number().int().min(1).max(10),
  roommatePrivateRoom: z.boolean(),
  roommateFurnished: z.boolean(),
  roommateSharedBathroom: z.boolean(),
  roommateSharedKitchen: z.boolean(),
  roommateAuthorizationConfirmed: z.boolean().refine((value) => value, 'Confirma que eres propietario o tienes autorización para compartir el espacio.'),
  petsAllowed: z.boolean(),
  smokingAllowed: z.boolean(),
  alcoholConsumptionAllowed: z.boolean(),
  alcoholSalesAllowed: z.boolean(),
  commercialActivityAllowed: z.boolean(),
  commercialActivityNotes: plainText(0, 240).optional().or(z.literal('')),
  roommatePreferences: plainText(0, 300).optional().or(z.literal('')),
  waterBilling: z.enum(['included', 'extra', 'unknown']),
  waterMonthlyCost: z.number().min(0).max(100000).optional(),
  electricityBilling: z.enum(['included', 'extra', 'unknown']),
  electricityMonthlyCost: z.number().min(0).max(100000).optional(),
  internetBilling: z.enum(['included', 'extra', 'unknown']),
  internetMonthlyCost: z.number().min(0).max(100000).optional(),
  publicationConsentAccepted: z.boolean().refine((value) => value, 'Confirma que tienes autorización para publicar.'),
}).strict().refine((data) =>
  (data.waterBilling !== 'extra' || data.waterMonthlyCost !== undefined)
  && (data.electricityBilling !== 'extra' || data.electricityMonthlyCost !== undefined)
  && (data.internetBilling !== 'extra' || data.internetMonthlyCost !== undefined), {
  message: 'Indica el costo estimado mensual de cada servicio que se paga aparte.',
  path: ['waterMonthlyCost'],
});

export type RoommateListingInput = z.infer<typeof roommateListingSchema>;

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
  visitRequestedAt: z.number().int().positive().optional(),
  openHouseRsvp: z.boolean().optional(),
}).strict();

export type InternalMessageInput = z.infer<typeof internalMessageSchema>;
