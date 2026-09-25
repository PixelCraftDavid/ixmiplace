import { z } from 'zod';
import { LISTING_LIMITS } from './constants';

// ============================================================
// Crear/editar una publicación
// ============================================================

export const listingSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(LISTING_LIMITS.titleMin, `Mínimo ${LISTING_LIMITS.titleMin} caracteres`)
      .max(LISTING_LIMITS.titleMax, `Máximo ${LISTING_LIMITS.titleMax} caracteres`),

    description: z
      .string()
      .trim()
      .min(
        LISTING_LIMITS.descriptionMin,
        `Describe tu propiedad (mínimo ${LISTING_LIMITS.descriptionMin} caracteres)`
      )
      .max(LISTING_LIMITS.descriptionMax, `Máximo ${LISTING_LIMITS.descriptionMax} caracteres`),

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

    establishmentName: z.string().trim().max(100).optional().or(z.literal('')),
    roomType: z.string().trim().max(80).optional().or(z.literal('')),
    stayDurationHours: z.number().int().min(1).max(24).optional(),
    checkInTime: z.string().optional().or(z.literal('')),
    checkOutTime: z.string().optional().or(z.literal('')),
    reception24h: z.boolean().optional(),
    foodAvailable: z.boolean().optional(),
    foodDescription: z.string().trim().max(300).optional().or(z.literal('')),

    colonia: z
      .string()
      .trim()
      .min(2, 'Indica la colonia o zona')
      .max(80, 'Máximo 80 caracteres'),

    address: z.string().trim().max(200).optional().or(z.literal('')),

    // 🆕 Ubicación en el mapa (requerida)
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

    amenities: z.array(z.string()).optional(),

    showPhone: z.boolean().default(true),

    availability: z
      .enum(['available', 'occupied', 'reserved', 'rented', 'sold', 'unavailable', 'unconfirmed'])
      .optional(),
  })
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
  comment: z.string().trim().max(500).optional().or(z.literal('')),
});

export type ReportInput = z.infer<typeof reportSchema>;

export const internalMessageSchema = z.object({
  subject: z.string().trim().min(3, 'Escribe un asunto').max(100, 'Máximo 100 caracteres'),
  message: z.string().trim().min(10, 'Escribe al menos 10 caracteres').max(1000, 'Máximo 1000 caracteres'),
});

export type InternalMessageInput = z.infer<typeof internalMessageSchema>;
