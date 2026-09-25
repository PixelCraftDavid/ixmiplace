import type {
  ListingCategory,
  ListingOperation,
  PriceUnit,
  AvailabilityStatus,
} from '../types/models';

// ============================================================
// Categorías
// ============================================================

export const CATEGORIES: { value: ListingCategory; label: string; emoji: string }[] = [
  { value: 'casa',          label: 'Casa',          emoji: '🏠' },
  { value: 'departamento',  label: 'Departamento',  emoji: '🏢' },
  { value: 'cuarto',        label: 'Cuarto',        emoji: '🛏️' },
  { value: 'terreno',       label: 'Terreno',       emoji: '🌾' },
  { value: 'local',         label: 'Local comercial', emoji: '🏪' },
  { value: 'hotel',         label: 'Hotel',         emoji: '🏨' },
  { value: 'motel',         label: 'Motel',         emoji: '🛎️' },
];

export function categoryLabel(value: ListingCategory): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function categoryEmoji(value: ListingCategory): string {
  return CATEGORIES.find((c) => c.value === value)?.emoji ?? '📌';
}

// ============================================================
// Operaciones
// ============================================================

export const OPERATIONS: { value: ListingOperation; label: string }[] = [
  { value: 'renta',     label: 'En renta' },
  { value: 'venta',     label: 'En venta' },
  { value: 'hospedaje', label: 'Hospedaje' },
];

export function operationLabel(value: ListingOperation): string {
  return OPERATIONS.find((o) => o.value === value)?.label ?? value;
}

// ============================================================
// Unidad de precio según operación
// ============================================================

export function priceUnitsFor(operation: ListingOperation): { value: PriceUnit; label: string }[] {
  switch (operation) {
    case 'renta':
      return [
        { value: 'mes',   label: 'por mes' },
        { value: 'total', label: 'total' },
      ];
    case 'hospedaje':
      return [
        { value: 'noche', label: 'por noche' },
        { value: 'mes',   label: 'por mes' },
      ];
    case 'venta':
      return [{ value: 'total', label: 'precio total' }];
  }
}

export function priceUnitLabel(unit?: PriceUnit): string {
  switch (unit) {
    case 'mes':   return '/ mes';
    case 'noche': return '/ noche';
    case 'total': return '';
    case 'estancia': return '/ estancia';
    default:      return '';
  }
}

// ============================================================
// Disponibilidad
// ============================================================

export const AVAILABILITY: {
  value: AvailabilityStatus;
  label: string;
  dot: string;      // clase de Tailwind para el punto de color
  bg: string;       // clase de fondo suave
}[] = [
  { value: 'available',   label: 'Disponible',         dot: 'bg-green-500',  bg: 'bg-green-50  text-green-700' },
  { value: 'occupied',    label: 'Ocupada',             dot: 'bg-red-500',    bg: 'bg-red-50    text-red-700' },
  { value: 'reserved',    label: 'Apartada',           dot: 'bg-yellow-500', bg: 'bg-yellow-50 text-yellow-700' },
  { value: 'rented',      label: 'Rentada',            dot: 'bg-red-500',    bg: 'bg-red-50    text-red-700' },
  { value: 'sold',        label: 'Vendida',            dot: 'bg-red-500',    bg: 'bg-red-50    text-red-700' },
  { value: 'unavailable', label: 'No disponible',      dot: 'bg-gray-400',   bg: 'bg-gray-100  text-gray-600' },
  { value: 'unconfirmed', label: 'Sin confirmar',      dot: 'bg-yellow-400', bg: 'bg-yellow-50 text-yellow-700' },
];

export function availabilityMeta(value: AvailabilityStatus) {
  return AVAILABILITY.find((a) => a.value === value) ?? AVAILABILITY[0];
}

// ============================================================
// Amenidades disponibles
// ============================================================

export const AMENITIES = [
  'agua',
  'luz',
  'drenaje',
  'internet',
  'amueblado',
  'estacionamiento',
  'cocina',
  'aire acondicionado',
  'calefacción',
  'seguridad',
  'jardín',
  'alberca',
] as const;

export type Amenity = (typeof AMENITIES)[number];

export const LODGING_AMENITIES = [
  'wifi',
  'televisión',
  'jacuzzi',
  'tina',
  'servicio a la habitación',
  'restaurante',
  'desayuno incluido',
  'baño privado',
  'agua caliente',
  'aire acondicionado',
  'estacionamiento',
  'seguridad',
] as const;

// ============================================================
// Reglas de negocio
// ============================================================

export const LISTING_LIMITS = {
  titleMin: 8,
  titleMax: 80,
  descriptionMin: 30,
  descriptionMax: 1500,
  priceMax: 10_000_000,
  photosMin: 1,
  photosMax: 10,
  photoMaxSizeMB: 5,
  activeDays: 30,               // días que dura un anuncio activo
  confirmationGraceDays: 7,     // días antes de expirar que se pide confirmación
} as const;
